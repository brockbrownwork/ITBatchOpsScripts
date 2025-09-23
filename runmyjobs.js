/**
 * Clicks the refresh button to ensure the job list is up-to-date.
 */
function clickRefreshButton() {
    const targetButton = document.querySelector('.ULButton.RWItem:has(span.ULButton-Icon.IMAGE_RWGENERAL_REFRESH)');
    if (targetButton) {
        targetButton.click();
        console.log('✅ Clicked the refresh button.');
    } else {
        console.warn('Refresh button not found.');
    }
}

/**
 * Scrolls the table until all results are loaded.
 * @returns {Promise<string>} A promise that resolves when loading is complete or rejects on timeout.
 */
function scrollTableUntilLoaded() {
    // This function is now wrapped in a Promise.
    return new Promise((resolve, reject) => {
        const table = document.querySelector('.TableInt');

        if (!table) {
            // If the table doesn't exist, reject the promise immediately.
            return reject(new Error("Could not find an element with class 'TableInt' to scroll."));
        }

        let scrollCount = 0;
        const maxScrolls = 50;
        const scrollAmount = 2000;
        const scrollInterval = 1000;

        const areAllResultsLoaded = () => {
            const regex = /^Showing (\d+) of \1 results$/;
            const spans = document.querySelectorAll('span');
            for (const span of spans) {
                if (regex.test(span.textContent.trim())) {
                    console.log(`✅ Found completion text: "${span.textContent.trim()}"`);
                    return true;
                }
            }
            return false;
        };

        const intervalId = setInterval(() => {
            if (areAllResultsLoaded()) {
                clearInterval(intervalId);
                // Resolve the promise when scrolling is successful.
                resolve("All results are loaded. Scrolling has stopped.");
                return;
            }

            if (scrollCount >= maxScrolls) {
                clearInterval(intervalId);
                // Reject the promise if we hit the scroll limit.
                reject(new Error(`Stopped scrolling after ${maxScrolls} attempts. The completion text was not found.`));
                return;
            }

            table.scrollBy({
                top: scrollAmount,
                left: 0,
                behavior: 'smooth'
            });
            scrollCount++;
            console.log(`Scrolled... Attempt ${scrollCount}/${maxScrolls}`);
        }, scrollInterval);
    });
}

/**
 * Populates the job list by clicking refresh and then scrolling until all jobs are loaded.
 * This function is now async to await the completion of scrolling.
 */
async function populateJobs() {
    clickRefreshButton();
    // A small delay to allow the table to react to the refresh click before scrolling begins.
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    try {
        const result = await scrollTableUntilLoaded();
        console.log(result); // Logs the resolution message from the promise
    } catch (error) {
        console.error(error);
        // We throw the error so the calling function (processTableRows) knows something went wrong.
        throw error;
    }
}


// This is your original function, now correctly awaiting the modified populateJobs.
async function sendCSV() {
    try {
        // Await the completion of populateJobs() before continuing.
        // This will now pause execution until the promise from scrollTableUntilLoaded is resolved.
        console.log("Starting to populate jobs...");
        await populateJobs();
        console.log("Job population complete. Processing table rows...");

        const tableHeaders = printTableHeaders();
        let csvContent = "";
        const targetElement = document.querySelector('.ULPanel.RWHorizontal.OverviewPage');

        if (targetElement) {
            csvContent += tableHeaders.join(',') + '\n';
            const rows = targetElement.querySelectorAll('tr');

            if (rows.length > 0) {
                rows.forEach((row, rowIndex) => {
                    if (rowIndex + 1 >= 3) {
                        const cells = row.querySelectorAll('td');
                        const rowData = [];
                        cells.forEach((cell) => {
                            let cellText = cell.textContent.trim().replace(/"/g, '""'); // Escape double quotes
                            if (cellText === "ErrorView Log") {
                                cellText = "Error";
                            }
                            rowData.push(`"${cellText}"`);
                        });
                        csvContent += rowData.join(',') + '\n';
                    }
                });
                console.log("CSV content generated.");
                sendMessage(csvContent); // Assuming sendMessage is defined elsewhere
                return csvContent;
            } else {
                console.log('No <tr> elements found inside the target element.');
                return null;
            }
        } else {
            console.log('No element found with the classes: ULPanel, RWHorizontal, OverviewPage');
            return null;
        }
    } catch (error) {
        console.error("Failed to process table rows due to an error during population:", error.message);
        return null; // Stop execution if population fails
    }
}

async function copyCSVAboveSelected() {
    try {
        // Await the completion of populateJobs() before continuing.
        console.log("Starting to populate jobs...");
        await populateJobs();
        console.log("Job population complete. Processing table rows...");

        const tableHeaders = printTableHeaders();
        let csvContent = "";
        const targetElement = document.querySelector('.ULPanel.RWHorizontal.OverviewPage');

        if (targetElement) {
            csvContent += tableHeaders.join(',') + '\n';
            // Get all rows as a true Array to use Array methods
            const allRows = Array.from(targetElement.querySelectorAll('tr'));

            if (allRows.length > 0) {
                
                // --- MODIFICATIONS START ---

                let stopIndex = -1;

                // 1. Find the selected row directly using a CSS selector
                const selectedRow = targetElement.querySelector('tr.Selected');

                // 2. If a selected row is found, find its index within the full list of rows
                if (selectedRow) {
                    stopIndex = allRows.indexOf(selectedRow);
                    console.log(`'Selected' row found at index: ${stopIndex}`);
                }

                // If no row is selected (stopIndex is still -1), process all rows
                if (stopIndex === -1) {
                    console.log("Could not find a 'Selected' row. Processing all available rows.");
                    stopIndex = allRows.length - 1;
                }

                // 3. Iterate through rows up to and including the 'stopIndex'
                for (let i = 0; i <= stopIndex; i++) {
                    const row = allRows[i];
                    
                    // The original logic starts processing from the 3rd row (index 2)
                    if (i >= 2) { 
                        const cells = row.querySelectorAll('td');
                        const rowData = [];
                        cells.forEach((cell) => {
                            let cellText = cell.textContent.trim().replace(/"/g, '""'); // Escape double quotes
                            if (cellText === "ErrorView Log") {
                                cellText = "Error";
                            }
                            rowData.push(`"${cellText}"`);
                        });
                        csvContent += rowData.join(',') + '\n';
                    }
                }

                console.log("CSV content generated.");

                // Copy the generated CSV content to the clipboard
                try {
                    await navigator.clipboard.writeText(csvContent);
                    console.log('CSV content copied to clipboard successfully. 📋');
                } catch (err) {
                    console.error('Failed to copy to clipboard:', err);
                }
                
                // --- MODIFICATIONS END ---

                return csvContent;

            } else {
                console.log('No <tr> elements found inside the target element.');
                return null;
            }
        } else {
            console.log('No element found with the classes: ULPanel, RWHorizontal, OverviewPage');
            return null;
        }
    } catch (error) {
        console.error("Failed to process table rows due to an error during population:", error.message);
        return null;
    }
}

// NOTE: Your other functions (sendMessage, printTableHeaders) do not need to be changed.

async function sendMessage(message) {
    const url = 'http://127.0.0.1:5000/message';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: message
        });

        if (response.ok) {
            console.log('Message sent successfully!');
            // Clear the input field after successful send
        } else {
            const errorText = await response.text();
            console.error('Failed to send message:', response.status, errorText);
        }
    } catch (error) {
        // The catch block is now an important safety net for network errors,
        // such as if the server is down.
        console.error('Network error:', error);
    }
}

function printTableHeaders() {
    // 1. Get all <th> elements on the page.
    const headerElements = document.querySelectorAll('th');

    // 2. Create an empty array to store the text content.
    let headerTexts = [];
    
    // 3. Loop through the NodeList of elements and push the text content to the array.
    headerElements.forEach(header => {
        headerTexts.push(header.textContent.trim());
    });

    headerTexts = headerTexts.slice(0, -1);
    // 4. Also log the result to the browser's console for debugging.
    console.log("Table Headers:", headerTexts);
    return headerTexts;
}