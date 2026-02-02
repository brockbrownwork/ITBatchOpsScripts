/**
 * TWS Job Watcher - Standalone Version
 *
 * Monitors TWS table for jobs in error states (ABEND, FAIL, CANCEL, CANCELLED)
 * and announces new entries via TTS.
 * This is a standalone version that can be loaded directly in the browser console
 * or included as a script on the page.
 *
 * Usage:
 *   - Paste this script into the browser console on the TWS page
 *   - Or include it as a <script> tag
 *
 * Commands:
 *   TWSAbendWatcher.start(30)     - Start watching (check every 30 seconds)
 *   TWSAbendWatcher.stop()        - Stop watching
 *   TWSAbendWatcher.checkNow()    - Run a single check now
 *   TWSAbendWatcher.reset()       - Clear seen entries
 */

// NOTE: This script uses a recursive frame crawler to find elements because the TWS page
// has nested <html> and <frame> elements that prevent normal document.querySelector from working.
// The findElementRecursive() function drills through frames, iframes, and nested html tags.

(function() {
    'use strict';

    const TWSAbendWatcher = {
        version: "2.0-standalone",
        seenEntries: new Map(), // key: "Job|State|SchedTime" -> count
        targetNames: ["Job", "State", "Sched Time"],
        // States to watch for (case-insensitive matching)
        watchStates: ["ABEND", "FAIL", "CANCEL", "CANCELLED"],
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
                console.error("[TWSAbendWatcher] ERROR: TWS Table not found. Are you sure the frame is loaded?");
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

        // Check if a state matches our watch list
        isWatchedState(state) {
            if (!state) return false;
            const upperState = state.toUpperCase().trim();
            return this.watchStates.some(ws => upperState.includes(ws));
        },

        // Filter rows to only include watched states
        filterWatchedRows(rows) {
            return rows.filter(row => this.isWatchedState(row["State"]));
        },

        // Speak text using Web Speech API
        speak(text) {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                window.speechSynthesis.speak(utterance);
                console.log(`[TWSAbendWatcher] [TTS] ${text}`);
            } else {
                console.warn("[TWSAbendWatcher] WARN: Speech synthesis not supported in this browser.");
            }
        },

        // Click the refresh button using recursive finder
        clickRefresh() {
            const btn = this.findElementRecursive(document, "body > form > input[type=button]:nth-child(21)");
            if (btn) {
                btn.click();
                return true;
            }
            console.warn("[TWSAbendWatcher] WARN: Refresh button not found.");
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
                console.log("[TWSAbendWatcher]   (table is empty)");
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

            // Build table as array for console.table alternative
            console.log("[TWSAbendWatcher] Table:");
            console.log(`  +-${cols.map(col => "-".repeat(widths[col])).join("-+-")}-+`);
            console.log(`  | ${header} |`);
            console.log(`  +-${cols.map(col => "-".repeat(widths[col])).join("-+-")}-+`);

            rows.forEach(row => {
                const line = cols.map(col => (row[col] || "").padEnd(widths[col])).join(" | ");
                console.log(`  | ${line} |`);
            });

            console.log(`  +-${cols.map(col => "-".repeat(widths[col])).join("-+-")}-+`);
        },

        // Main check function - checks for new entries then refreshes
        async performCheck() {
            const allRows = this.extractRows();
            const currentRows = this.filterWatchedRows(allRows);
            console.log(`[TWSAbendWatcher] [${new Date().toLocaleTimeString()}] TWS Table (${currentRows.length} watched entries out of ${allRows.length} total)`);
            this.logTable(currentRows);

            const newEntries = this.checkForNewEntries(currentRows);

            if (newEntries.length > 0) {
                console.warn(`[TWSAbendWatcher] ⚠ Found ${newEntries.length} NEW entry(ies)!`);
                newEntries.forEach(entry => {
                    console.warn(`[TWSAbendWatcher]   NEW: ${entry["Job"]} | ${entry["State"]} | ${entry["Sched Time"]}`);
                });

                newEntries.forEach(entry => {
                    const jobName = entry["Job"] || "unknown job";
                    const state = entry["State"] || "error";
                    this.speak(`TWS job ${state}: ${jobName}`);
                });
            } else {
                console.log("[TWSAbendWatcher] ✓ No new entries");
            }

            // Refresh after checking so data is fresh for next check
            console.log(`[TWSAbendWatcher] [${new Date().toLocaleTimeString()}] Refreshing...`);
            this.clickRefresh();

            return newEntries;
        },

        // Initialize - capture current state without announcing
        initialize() {
            const allRows = this.extractRows();
            const currentRows = this.filterWatchedRows(allRows);

            currentRows.forEach(entry => {
                const key = this.getEntryKey(entry);
                this.seenEntries.set(key, (this.seenEntries.get(key) || 0) + 1);
            });

            console.log(`[TWSAbendWatcher] Initialized: ${currentRows.length} watched entries (watching for: ${this.watchStates.join(", ")})`);
            this.logTable(currentRows);
        },

        // Start periodic checking
        start(intervalSeconds = 30) {
            if (this.isRunning) {
                console.log("[TWSAbendWatcher] Already running.");
                return;
            }

            this.initialize();
            this.isRunning = true;

            this.checkInterval = setInterval(() => {
                this.performCheck();
            }, intervalSeconds * 1000);

            console.log(`[TWSAbendWatcher] Started watching. Checking every ${intervalSeconds} seconds.`);
        },

        // Stop periodic checking
        stop() {
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
            }
            this.isRunning = false;
            console.log("[TWSAbendWatcher] Stopped watching.");
        },

        // Reset seen entries
        reset() {
            this.seenEntries.clear();
            console.log("[TWSAbendWatcher] Reset seen entries.");
        },

        // Run a single check manually
        async checkNow() {
            return await this.performCheck();
        }
    };

    // Expose to global scope
    window.TWSAbendWatcher = TWSAbendWatcher;

    console.log(`[TWSAbendWatcher] === TWS Abend Watcher v${TWSAbendWatcher.version} Loaded ===`);
    console.log("[TWSAbendWatcher] Commands:");
    console.log("[TWSAbendWatcher]   TWSAbendWatcher.start(30)     - Start watching (check every 30 seconds)");
    console.log("[TWSAbendWatcher]   TWSAbendWatcher.stop()        - Stop watching");
    console.log("[TWSAbendWatcher]   TWSAbendWatcher.checkNow()    - Run a single check now");
    console.log("[TWSAbendWatcher]   TWSAbendWatcher.reset()       - Clear seen entries");

    // Auto-start watching on load
    console.log("[TWSAbendWatcher] Auto-starting in 2 seconds...");
    setTimeout(() => {
        TWSAbendWatcher.start(30);
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance("TWS Abend Watcher started");
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    }, 2000);
})();
