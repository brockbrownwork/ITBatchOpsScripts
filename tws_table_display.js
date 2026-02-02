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
 *   TWSTableDisplay.downloadPDF()    - Download table as landscape PDF
 */


const TWSTableDisplay = {
        version: "1.2",

        // Color mapping for cell classes
        cellColors: {
            good: [144, 238, 144],     // light green
            error: [255, 182, 182],    // light red
            warning: [255, 255, 150]   // light yellow
        },

        // Load jsPDF library dynamically
        async loadJsPDF() {
            if (window.jspdf) return window.jspdf;

            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = () => {
                    console.log("[TWSTableDisplay] jsPDF library loaded.");
                    resolve(window.jspdf);
                };
                script.onerror = () => reject(new Error("Failed to load jsPDF library"));
                document.head.appendChild(script);
            });
        },

        // Load jsPDF-AutoTable plugin for table rendering
        async loadAutoTable() {
            if (window.jspdf && window.jspdf.jsPDF.API.autoTable) return;

            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js';
                script.onload = () => {
                    console.log("[TWSTableDisplay] AutoTable plugin loaded.");
                    resolve();
                };
                script.onerror = () => reject(new Error("Failed to load AutoTable plugin"));
                document.head.appendChild(script);
            });
        },

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

        // Extract all rows from the table (with optional cell class info for PDF)
        extractAllRows(includeCellClasses = false) {
            const tbody = this.findTableBody();
            if (!tbody) {
                console.error("[TWSTableDisplay] ERROR: TWS Table not found. Is the frame loaded?");
                return { rows: [], columns: [], cellClasses: [] };
            }

            const table = tbody.closest('table');
            const colMap = this.buildColumnMap(table);
            const columns = Object.keys(colMap);

            const rows = [];
            const cellClasses = [];

            Array.from(tbody.rows).forEach(row => {
                let entry = {};
                let rowClasses = {};
                for (const [title, index] of Object.entries(colMap)) {
                    const cell = row.cells[index];
                    entry[title] = cell?.innerText.trim() || "";
                    if (includeCellClasses && cell) {
                        // Check for status classes
                        if (cell.classList.contains('good')) {
                            rowClasses[title] = 'good';
                        } else if (cell.classList.contains('error')) {
                            rowClasses[title] = 'error';
                        } else if (cell.classList.contains('warning')) {
                            rowClasses[title] = 'warning';
                        }
                    }
                }
                rows.push(entry);
                if (includeCellClasses) {
                    cellClasses.push(rowClasses);
                }
            });

            return { rows, columns, cellClasses };
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
        },

        // Download table as landscape PDF
        async downloadPDF(filterText = null, filterColumn = null) {
            console.log("[TWSTableDisplay] Preparing PDF download...");

            try {
                await this.loadJsPDF();
                await this.loadAutoTable();
            } catch (e) {
                console.error("[TWSTableDisplay] Failed to load PDF libraries:", e.message);
                return;
            }

            const { rows, columns, cellClasses } = this.extractAllRows(true);

            if (rows.length === 0) {
                console.log("[TWSTableDisplay] No data to export.");
                return;
            }

            let displayRows = rows;
            let displayCellClasses = cellClasses;

            // Apply filter if provided
            if (filterText) {
                const searchText = filterText.toLowerCase();
                const filteredIndices = [];
                displayRows = rows.filter((row, idx) => {
                    let matches = false;
                    if (filterColumn) {
                        const val = row[filterColumn] || "";
                        matches = val.toLowerCase().includes(searchText);
                    } else {
                        matches = Object.values(row).some(val =>
                            val.toLowerCase().includes(searchText)
                        );
                    }
                    if (matches) filteredIndices.push(idx);
                    return matches;
                });
                displayCellClasses = filteredIndices.map(idx => cellClasses[idx]);
            }

            if (displayRows.length === 0) {
                console.log("[TWSTableDisplay] No matching rows to export.");
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'letter'
            });

            // Title
            const timestamp = new Date().toLocaleString();
            doc.setFontSize(14);
            doc.text("TWS Job Table", 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated: ${timestamp}`, 14, 22);
            if (filterText) {
                doc.text(`Filter: "${filterText}"${filterColumn ? ` (${filterColumn})` : ""}`, 14, 28);
            }

            // Prepare table data
            const headers = columns;
            const tableData = displayRows.map(row => headers.map(col => row[col] || ""));

            // Build column index lookup
            const colIndexMap = {};
            headers.forEach((h, i) => colIndexMap[h] = i);

            // Auto-table with styling
            const self = this;
            doc.autoTable({
                head: [headers],
                body: tableData,
                startY: filterText ? 32 : 26,
                styles: {
                    fontSize: 7,
                    cellPadding: 1.5,
                    overflow: 'linebreak',
                    lineWidth: 0.1
                },
                headStyles: {
                    fillColor: [66, 66, 66],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 7
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                margin: { top: 10, left: 10, right: 10, bottom: 10 },
                tableWidth: 'auto',
                didParseCell: function(data) {
                    if (data.section === 'body') {
                        const rowIdx = data.row.index;
                        const colName = headers[data.column.index];
                        const cellClass = displayCellClasses[rowIdx]?.[colName];
                        if (cellClass && self.cellColors[cellClass]) {
                            data.cell.styles.fillColor = self.cellColors[cellClass];
                        }
                    }
                }
            });

            // Generate filename with timestamp
            const dateStr = new Date().toISOString().slice(0, 10);
            const timeStr = new Date().toTimeString().slice(0, 5).replace(":", "");
            const filename = `TWS_Table_${dateStr}_${timeStr}.pdf`;

            doc.save(filename);
            console.log(`[TWSTableDisplay] PDF downloaded: ${filename} (${displayRows.length} rows)`);
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
    console.log("[TWSTableDisplay]   TWSTableDisplay.downloadPDF()       - Download table as landscape PDF");
    console.log("[TWSTableDisplay]   TWSTableDisplay.downloadPDF('text') - Download filtered table as PDF");
