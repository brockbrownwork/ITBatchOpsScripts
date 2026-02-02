/**
 * TWS Table Display - Shows the complete TWS job table
 *
 * Displays all rows from the TWS table, not just error states.
 * Uses recursive frame crawler to navigate nested frames.
 *
 * Usage:
 *   - Paste this script into the browser console on the TWS page
 *   - Or include it as a <script> tag
 *
 * Commands:
 *   TWSTableDisplay.show()           - Display the full table
 *   TWSTableDisplay.show("Job")      - Filter by column containing text
 *   TWSTableDisplay.columns()        - Show available column names
 *   TWSTableDisplay.refresh()        - Refresh the page and show table
 */


const TWSTableDisplay = {
        version: "1.0",

        // Recursive frame crawler - drills through frames, iframes, and nested html tags
        findElementRecursive(doc, selector) {
            let el = doc.querySelector(selector);
            if (el) return el;

            const frames = doc.querySelectorAll('frame, iframe');
            for (let i = 0; i < frames.length; i++) {
                try {
                    const frameDoc = frames[i].contentDocument || frames[i].contentWindow.document;
                    const found = this.findElementRecursive(frameDoc, selector);
                    if (found) return found;
                } catch (e) {
                    // Cross-origin security block
                }
            }
            return null;
        },

        // Find the target tbody
        findTableBody() {
            return this.findElementRecursive(document, "#sortable > tbody");
        },

        // Get all column headers
        getColumnHeaders(table) {
            const headers = Array.from(table.querySelectorAll('th'));
            return headers.map(th => th.innerText.replace(/\s+/g, ' ').trim());
        },

        // Build column index mapping from headers
        buildColumnMap(table) {
            const headers = this.getColumnHeaders(table);
            const colMap = {};
            headers.forEach((name, index) => {
                if (name) {
                    colMap[name] = index;
                }
            });
            return colMap;
        },

        // Extract all rows from the table
        extractAllRows() {
            const tbody = this.findTableBody();
            if (!tbody) {
                console.error("[TWSTableDisplay] ERROR: TWS Table not found. Is the frame loaded?");
                return { rows: [], columns: [] };
            }

            const table = tbody.closest('table');
            const colMap = this.buildColumnMap(table);
            const columns = Object.keys(colMap);

            const rows = Array.from(tbody.rows).map(row => {
                let entry = {};
                for (const [title, index] of Object.entries(colMap)) {
                    entry[title] = row.cells[index]?.innerText.trim() || "";
                }
                return entry;
            });

            return { rows, columns };
        },

        // Show available columns
        columns() {
            const { columns } = this.extractAllRows();
            if (columns.length === 0) {
                console.log("[TWSTableDisplay] No columns found.");
                return [];
            }
            console.log("[TWSTableDisplay] Available columns:");
            columns.forEach((col, i) => console.log(`  ${i + 1}. ${col}`));
            return columns;
        },

        // Display the table with optional filter
        show(filterText = null, filterColumn = null) {
            const { rows, columns } = this.extractAllRows();

            if (rows.length === 0) {
                console.log("[TWSTableDisplay] No data found.");
                return;
            }

            let displayRows = rows;

            // Apply filter if provided
            if (filterText) {
                const searchText = filterText.toLowerCase();
                displayRows = rows.filter(row => {
                    if (filterColumn) {
                        // Filter specific column
                        const val = row[filterColumn] || "";
                        return val.toLowerCase().includes(searchText);
                    } else {
                        // Filter any column
                        return Object.values(row).some(val =>
                            val.toLowerCase().includes(searchText)
                        );
                    }
                });
            }

            const timestamp = new Date().toLocaleTimeString();
            console.log(`[TWSTableDisplay] [${timestamp}] TWS Table (${displayRows.length} rows${filterText ? `, filtered by "${filterText}"` : ""})`);

            if (displayRows.length === 0) {
                console.log("[TWSTableDisplay] No matching rows.");
                return;
            }

            console.table(displayRows);
            return displayRows;
        },

        // Filter by state
        byState(state) {
            return this.show(state, "State");
        },

        // Filter by job name
        byJob(jobName) {
            return this.show(jobName, "Job");
        },

        // Click the refresh button
        clickRefresh() {
            const btn = this.findElementRecursive(document, "body > form > input[type=button]:nth-child(21)");
            if (btn) {
                btn.click();
                return true;
            }
            console.warn("[TWSTableDisplay] Refresh button not found.");
            return false;
        },

        // Refresh and show table after delay
        refresh(delayMs = 2000) {
            console.log("[TWSTableDisplay] Refreshing page...");
            if (this.clickRefresh()) {
                setTimeout(() => this.show(), delayMs);
            }
        },

        // Get raw data for programmatic use
        getData() {
            return this.extractAllRows();
        }
    };

    // Expose to global scope
    window.TWSTableDisplay = TWSTableDisplay;

    console.log(`[TWSTableDisplay] === TWS Table Display v${TWSTableDisplay.version} Loaded ===`);
    console.log("[TWSTableDisplay] Commands:");
    console.log("[TWSTableDisplay]   TWSTableDisplay.show()              - Display full table");
    console.log("[TWSTableDisplay]   TWSTableDisplay.show('text')        - Filter rows containing text");
    console.log("[TWSTableDisplay]   TWSTableDisplay.byState('SUCC')     - Filter by State column");
    console.log("[TWSTableDisplay]   TWSTableDisplay.byJob('JOBNAME')    - Filter by Job column");
    console.log("[TWSTableDisplay]   TWSTableDisplay.columns()           - Show available columns");
    console.log("[TWSTableDisplay]   TWSTableDisplay.refresh()           - Refresh page and show table");
    console.log("[TWSTableDisplay]   TWSTableDisplay.getData()           - Get raw data object");
