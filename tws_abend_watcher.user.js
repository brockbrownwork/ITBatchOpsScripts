// ==UserScript==
// @name         TWS Abend Watcher
// @namespace    https://github.com/brockbrownwork/ITBatchOpsScripts
// @version      1.0
// @description  Monitors TWS abend table for new entries and announces via TTS
// @author       Brock Brown
// @match        *://rhesprodtws01/*
// @match        *://*.jewels.com/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/brockbrownwork/ITBatchOpsScripts/main/tws_abend_watcher.user.js
// @downloadURL  https://raw.githubusercontent.com/brockbrownwork/ITBatchOpsScripts/main/tws_abend_watcher.user.js
// ==/UserScript==

// NOTE: This script uses a recursive frame crawler to find elements because the TWS page
// has nested <html> and <frame> elements that prevent normal document.querySelector from working.
// The findElementRecursive() function drills through frames, iframes, and nested html tags.

(function() {
    'use strict';

    const TWSAbendWatcher = {
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
                console.error("TWS Table not found. Are you sure the frame is loaded?");
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
                console.log(`[TTS] ${text}`);
            } else {
                console.warn("Speech synthesis not supported in this browser.");
            }
        },

        // Click the refresh button using recursive finder
        clickRefresh() {
            const btn = this.findElementRecursive(document, "body > form > input[type=button]:nth-child(21)");
            if (btn) {
                btn.click();
                return true;
            }
            console.warn("Refresh button not found.");
            return false;
        },

        // Check for new entries
        checkForNewEntries() {
            const currentRows = this.extractRows();
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

        // Main check function - refreshes and checks for new entries
        async performCheck() {
            console.log(`[${new Date().toLocaleTimeString()}] Refreshing...`);
            this.clickRefresh();

            // Wait 1 second for refresh to complete
            await new Promise(resolve => setTimeout(resolve, 1000));

            const newEntries = this.checkForNewEntries();

            if (newEntries.length > 0) {
                console.log(`%c Found ${newEntries.length} new entry(ies): `, "background: #222; color: #bada55; font-size: 14px;");
                console.table(newEntries);

                newEntries.forEach(entry => {
                    const jobName = entry["Job"] || "unknown job";
                    this.speak(`There's a new TWS abend: ${jobName}`);
                });
            } else {
                console.log("No new entries.");
            }

            return newEntries;
        },

        // Initialize - capture current state without announcing
        initialize() {
            const currentRows = this.extractRows();

            currentRows.forEach(entry => {
                const key = this.getEntryKey(entry);
                this.seenEntries.set(key, (this.seenEntries.get(key) || 0) + 1);
            });

            console.log(`%c TWS Abend Watcher Initialized: ${currentRows.length} existing entries `, "background: #222; color: #bada55; font-size: 14px;");
            console.table(currentRows);
        },

        // Start periodic checking
        start(intervalSeconds = 30) {
            if (this.isRunning) {
                console.log("Already running.");
                return;
            }

            this.initialize();
            this.isRunning = true;

            this.checkInterval = setInterval(() => {
                this.performCheck();
            }, intervalSeconds * 1000);

            console.log(`Started watching. Checking every ${intervalSeconds} seconds.`);
        },

        // Stop periodic checking
        stop() {
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
            }
            this.isRunning = false;
            console.log("Stopped watching.");
        },

        // Reset seen entries
        reset() {
            this.seenEntries.clear();
            console.log("Reset seen entries.");
        },

        // Run a single check manually
        async checkNow() {
            return await this.performCheck();
        }
    };

    // Expose to global scope
    window.TWSAbendWatcher = TWSAbendWatcher;

    console.log("=== TWS Abend Watcher Loaded ===");
    console.log("Commands:");
    console.log("  TWSAbendWatcher.start(30)     - Start watching (check every 30 seconds)");
    console.log("  TWSAbendWatcher.stop()        - Stop watching");
    console.log("  TWSAbendWatcher.checkNow()    - Run a single check now");
    console.log("  TWSAbendWatcher.reset()       - Clear seen entries");
})();
