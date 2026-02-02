// TWS Abend Watcher - Monitors for new table entries and announces via TTS
// Usage: Run in browser console on the TWS page

(function() {
    const TWSAbendWatcher = {
        seenEntries: new Map(), // key: "Job|State|SchedTime" -> count
        targetNames: ["Job", "State", "Sched Time"],
        isRunning: false,
        checkInterval: null,

        // Find the target tbody in frames
        findTableBody() {
            for (let i = 0; i < window.frames.length; i++) {
                try {
                    const found = window.frames[i].document.querySelector("#sortable > tbody");
                    if (found) return { tbody: found, frameDoc: window.frames[i].document };
                } catch (e) {}
            }
            return null;
        },

        // Build column index mapping from headers
        buildColumnMap(table) {
            const headerElements = Array.from(table.querySelectorAll('th'));
            const colMap = {};

            headerElements.forEach((th, index) => {
                const text = th.textContent.trim().toLowerCase();
                const titleAttr = th.getAttribute('title')?.toLowerCase() || "";

                this.targetNames.forEach(target => {
                    const targetLower = target.toLowerCase();
                    if (text === targetLower || titleAttr === targetLower || text.includes(targetLower)) {
                        colMap[target] = index;
                    }
                });
            });

            return colMap;
        },

        // Extract all current rows from the table
        extractRows() {
            const result = this.findTableBody();
            if (!result) {
                console.error("Could not find the table.");
                return [];
            }

            const { tbody } = result;
            const table = tbody.closest('table');
            const colMap = this.buildColumnMap(table);

            return Array.from(tbody.rows).map(row => {
                const cells = row.cells;
                let entry = {};

                for (const [title, index] of Object.entries(colMap)) {
                    entry[title] = cells[index]?.innerText.trim() || "N/A";
                }
                return entry;
            });
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

        // Click the refresh button
        clickRefresh() {
            const result = this.findTableBody();
            if (!result) {
                // Try main document as fallback
                const btn = document.querySelector("body > form > input[type=button]:nth-child(21)");
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            }

            // Try to find refresh button in the frame
            const btn = result.frameDoc.querySelector("body > form > input[type=button]:nth-child(21)");
            if (btn) {
                btn.click();
                return true;
            }

            // Fallback to main document
            const mainBtn = document.querySelector("body > form > input[type=button]:nth-child(21)");
            if (mainBtn) {
                mainBtn.click();
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
                console.log(`Found ${newEntries.length} new entry(ies):`);
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

            console.log(`Initialized with ${currentRows.length} existing entries.`);
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

        // Inject a test entry into the table (for testing purposes)
        injectTestEntry(jobName = "TEST_JOB_001") {
            const result = this.findTableBody();
            if (!result) {
                console.error("Could not find the table to inject test entry.");
                return false;
            }

            const { tbody } = result;
            const table = tbody.closest('table');
            const colMap = this.buildColumnMap(table);

            // Create a new row based on existing row structure
            const existingRow = tbody.rows[0];
            if (!existingRow) {
                console.error("No existing rows to use as template.");
                return false;
            }

            const newRow = existingRow.cloneNode(true);

            // Set the Job column
            if (colMap["Job"] !== undefined && newRow.cells[colMap["Job"]]) {
                newRow.cells[colMap["Job"]].innerText = jobName;
            }

            // Set the State column
            if (colMap["State"] !== undefined && newRow.cells[colMap["State"]]) {
                newRow.cells[colMap["State"]].innerText = "ABEND";
            }

            // Set the Sched Time column
            if (colMap["Sched Time"] !== undefined && newRow.cells[colMap["Sched Time"]]) {
                newRow.cells[colMap["Sched Time"]].innerText = new Date().toLocaleTimeString();
            }

            // Add visual indicator for test row
            newRow.style.backgroundColor = "#ffcccc";

            tbody.insertBefore(newRow, tbody.firstChild);
            console.log(`Injected test entry: ${jobName}`);
            return true;
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
    console.log("  TWSAbendWatcher.injectTestEntry('TEST')  - Inject a test row");
})();
