// ==UserScript==
// @name         TWS Abend Watcher
// @namespace    https://github.com/brockbrownwork/ITBatchOpsScripts
// @version      1.5
// @description  Monitors TWS abend table for new entries and announces via TTS
// @author       Brock Brown
// @match        *://rhesprodtws01/*
// @match        *://*.jewels.com/*
// @grant        GM_log
// @grant        none
// @updateURL    https://raw.githubusercontent.com/brockbrownwork/ITBatchOpsScripts/main/tws_abend_watcher.user.js
// @downloadURL  https://raw.githubusercontent.com/brockbrownwork/ITBatchOpsScripts/main/tws_abend_watcher.user.js
// ==/UserScript==
//
// IMPORTANT: Remember to increment @version above before pushing changes!

// NOTE: This script uses a recursive frame crawler to find elements because the TWS page
// has nested <html> and <frame> elements that prevent normal document.querySelector from working.
// The findElementRecursive() function drills through frames, iframes, and nested html tags.

(function() {
    'use strict';

    const TWSAbendWatcher = {
        version: "1.5",
        seenEntries: new Map(), // key: "Job|State|SchedTime" -> count
        targetNames: ["Job", "State", "Sched Time"],
        isRunning: false,
        checkInterval: null,

        // Recursive frame crawler - drills through frames, iframes, and nested html tags
        // This is necessary because the TWS page has nested <html> and <frame> shenanigans
        // that prevent normal document.querySelector from finding elements
        findElementRecursive(doc, selector) {
            let el = doc.querySelector(selector);
            if (el) return el;

            const frames = doc.querySelectorAll('frame, iframe');
            for (let i = 0; i < frames.length; i++) {
                try {
                    // Access the document inside the frame
                    const frameDoc = frames[i].contentDocument || frames[i].contentWindow.document;
                    const found = this.findElementRecursive(frameDoc, selector);
                    if (found) return found;
                } catch (e) {
                    // Cross-origin security block - common in complex environments
                }
            }
            return null;
        },

        // Find the target tbody using recursive crawler
        findTableBody() {
            const tbody = this.findElementRecursive(document, "#sortable > tbody");
            if (!tbody) return null;
            return tbody;
        },

        // Build column index mapping from headers using innerText to bypass hidden junk
        buildColumnMap(table) {
            const headers = Array.from(table.querySelectorAll('th'));
            const colMap = {};

            headers.forEach((th, index) => {
                const text = th.innerText.replace(/\s+/g, ' ').trim().toLowerCase();
                this.targetNames.forEach(target => {
                    if (text.includes(target.toLowerCase())) {
                        colMap[target] = index;
                    }
                });
            });

            return colMap;
        },

        // Extract all current rows from the table
        extractRows() {
            const tbody = this.findTableBody();
            if (!tbody) {
                GM_log("ERROR: TWS Table not found. Are you sure the frame is loaded?");
                return [];
            }

            const table = tbody.closest('table');
            const colMap = this.buildColumnMap(table);

            return Array.from(tbody.rows).map(row => {
                let entry = {};
                for (const [title, index] of Object.entries(colMap)) {
                    entry[title] = row.cells[index]?.innerText.trim() || "N/A";
                }
                return entry;
            }).filter(r => Object.values(r).some(v => v !== "N/A"));
        },

        // Generate a unique key for an entry
        getEntryKey(entry) {
            return `${entry["Job"] || ""}|${entry["State"] || ""}|${entry["Sched Time"] || ""}`;
        },

        // Speak text using Web Speech API
        speak(text) {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                window.speechSynthesis.speak(utterance);
                GM_log(`[TTS] ${text}`);
            } else {
                GM_log("WARN: Speech synthesis not supported in this browser.");
            }
        },

        // Click the refresh button using recursive finder
        clickRefresh() {
            const btn = this.findElementRecursive(document, "body > form > input[type=button]:nth-child(21)");
            if (btn) {
                btn.click();
                return true;
            }
            GM_log("WARN: Refresh button not found.");
            return false;
        },

        // Check for new entries (accepts rows to avoid double extraction)
        checkForNewEntries(currentRows) {
            if (!currentRows) {
                currentRows = this.extractRows();
            }
            const currentCounts = new Map();

            // Count occurrences of each entry
            currentRows.forEach(entry => {
                const key = this.getEntryKey(entry);
                currentCounts.set(key, (currentCounts.get(key) || 0) + 1);
            });

            // Find new entries (key not seen before OR count increased)
            const newEntries = [];

            currentCounts.forEach((count, key) => {
                const previousCount = this.seenEntries.get(key) || 0;
                if (count > previousCount) {
                    // This is a new occurrence
                    const numNew = count - previousCount;
                    const entry = currentRows.find(e => this.getEntryKey(e) === key);
                    for (let i = 0; i < numNew; i++) {
                        newEntries.push(entry);
                    }
                }
            });

            // Update seen entries with current counts
            this.seenEntries = new Map(currentCounts);

            return newEntries;
        },

        // Log the current table in a nicely formatted way
        logTable(rows) {
            if (rows.length === 0) {
                GM_log("  (table is empty)");
                return;
            }

            // Calculate column widths
            const cols = this.targetNames;
            const widths = {};
            cols.forEach(col => {
                widths[col] = col.length;
                rows.forEach(row => {
                    const val = row[col] || "";
                    widths[col] = Math.max(widths[col], val.length);
                });
            });

            // Build header
            const header = cols.map(col => col.padEnd(widths[col])).join(" | ");
            const separator = cols.map(col => "-".repeat(widths[col])).join("-+-");

            // Build table as single string for GM_log
            let table = [];
            table.push(`  +-${cols.map(col => "-".repeat(widths[col])).join("-+-")}-+`);
            table.push(`  | ${header} |`);
            table.push(`  +-${separator}-+`);

            rows.forEach(row => {
                const line = cols.map(col => (row[col] || "").padEnd(widths[col])).join(" | ");
                table.push(`  | ${line} |`);
            });

            table.push(`  +-${cols.map(col => "-".repeat(widths[col])).join("-+-")}-+`);

            GM_log(table.join("\n"));
        },

        // Main check function - checks for new entries then refreshes
        async performCheck() {
            const currentRows = this.extractRows();
            GM_log(`[${new Date().toLocaleTimeString()}] TWS Abend Table (${currentRows.length} entries)`);
            this.logTable(currentRows);

            const newEntries = this.checkForNewEntries(currentRows);

            if (newEntries.length > 0) {
                GM_log(`⚠ Found ${newEntries.length} NEW entry(ies)!`);
                newEntries.forEach(entry => {
                    GM_log(`  NEW: ${entry["Job"]} | ${entry["State"]} | ${entry["Sched Time"]}`);
                });

                newEntries.forEach(entry => {
                    const jobName = entry["Job"] || "unknown job";
                    this.speak(`There's a new TWS abend: ${jobName}`);
                });
            } else {
                GM_log("✓ No new entries");
            }

            // Refresh after checking so data is fresh for next check
            GM_log(`[${new Date().toLocaleTimeString()}] Refreshing...`);
            this.clickRefresh();

            return newEntries;
        },

        // Initialize - capture current state without announcing
        initialize() {
            const currentRows = this.extractRows();

            currentRows.forEach(entry => {
                const key = this.getEntryKey(entry);
                this.seenEntries.set(key, (this.seenEntries.get(key) || 0) + 1);
            });

            GM_log(`TWS Abend Watcher Initialized: ${currentRows.length} existing entries`);
            this.logTable(currentRows);
        },

        // Start periodic checking
        start(intervalSeconds = 30) {
            if (this.isRunning) {
                GM_log("Already running.");
                return;
            }

            this.initialize();
            this.isRunning = true;

            this.checkInterval = setInterval(() => {
                this.performCheck();
            }, intervalSeconds * 1000);

            GM_log(`Started watching. Checking every ${intervalSeconds} seconds.`);
        },

        // Stop periodic checking
        stop() {
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
            }
            this.isRunning = false;
            GM_log("Stopped watching.");
        },

        // Reset seen entries
        reset() {
            this.seenEntries.clear();
            GM_log("Reset seen entries.");
        },

        // Run a single check manually
        async checkNow() {
            return await this.performCheck();
        }
    };

    // Expose to global scope
    window.TWSAbendWatcher = TWSAbendWatcher;

    GM_log(`=== TWS Abend Watcher v${TWSAbendWatcher.version} Loaded ===`);
    GM_log("Commands:");
    GM_log("  TWSAbendWatcher.start(30)     - Start watching (check every 30 seconds)");
    GM_log("  TWSAbendWatcher.stop()        - Stop watching");
    GM_log("  TWSAbendWatcher.checkNow()    - Run a single check now");
    GM_log("  TWSAbendWatcher.reset()       - Clear seen entries");

    // Test alert and TTS on load
    alert(`TWS Abend Watcher v${TWSAbendWatcher.version} loaded!`);
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance("TWS Abend Watcher loaded");
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }
})();
