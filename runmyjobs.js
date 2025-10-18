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
async function copyJobsAboveSelected() {
    try {
        // Await the completion of populateJobs() before continuing.
        console.log("Starting to populate jobs...");
        await populateJobs();
        console.log("Job population complete. Processing table rows...");

        const tableHeaders = printTableHeaders();
        let csvContent = "";
        const targetElement = document.querySelector('.ULPanel.RWHorizontal.OverviewPage');

        if (targetElement) {
            // Get all rows as a true Array to use Array methods
            const allRows = Array.from(targetElement.querySelectorAll('tr'));
            
            if (allRows.length > 0) {
                // Find the selected row directly using a CSS selector
                const selectedRow = targetElement.querySelector('tr.Selected');

                if (selectedRow) {
                    const selectedRowCells = selectedRow.querySelectorAll('td');
                    const selectedFolder = selectedRowCells[tableHeaders.indexOf('Folder')]?.textContent.trim();
                    const definitionColumnIndex = tableHeaders.indexOf('Definition');
                    let definitionsToCopy = '';

                    if (selectedFolder && definitionColumnIndex !== -1) {
                        // Iterate through all rows to find matches
                        for (const row of allRows) {
                            const cells = row.querySelectorAll('td');
                            const rowFolder = cells[tableHeaders.indexOf('Folder')]?.textContent.trim();
                            
                            // Check if the current row's folder matches the selected row's folder
                            if (rowFolder === selectedFolder) {
                                const definition = cells[definitionColumnIndex]?.textContent.trim();
                                if (definition) {
                                    definitionsToCopy += definition + '\n';
                                }
                            }
                        }
                    } else {
                        console.log("Could not find 'Folder' or 'Definition' header, or no selected folder value.");
                        return null;
                    }
                    
                    if (definitionsToCopy) {
                        try {
                            await navigator.clipboard.writeText(definitionsToCopy);
                            console.log('Definitions copied to clipboard successfully. 📋');
                        } catch (err) {
                            console.error('Failed to copy to clipboard:', err);
                        }
                    } else {
                        console.log("No definitions found for the selected folder.");
                        return null;
                    }
                } else {
                    console.log("No 'Selected' row found.");
                    return null;
                }
            } else {
                console.log('No <tr> elements found inside the target element.');
                return null;
            }
        } else {
            console.log('No element found with the classes: ULPanel, RWHorizontal, OverviewPage');
            return null;
        }
    } catch (error) {
        console.error("Failed to process table rows due to an error:", error.message);
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

/**
 * Finds the currently selected row in the job table, identifies its 'Folder',
 * then finds all rows ABOVE the selected one with the same folder. It copies the
 * 'Definition' (job name) of those matching rows to the clipboard, separated by newlines.
 */
/**
 * Finds the currently selected row, identifies its 'Folder', then finds all rows 
 * ABOVE it with the same folder. It processes the 'Definition' (job name) to
 * keep only the text before the first space. Finally, it copies the unique list
 * of processed job names to the clipboard, separated by newlines.
 */
async function copyMatchingJobsAboveSelected() {
    try {
        // 1. Ensure the entire job list is loaded on the page
        console.log("Starting to populate jobs...");
        // await populateJobs();
        // console.log("Job population complete. Ready to process.");

        // 2. Locate the main table and the user-selected row
        const tableContainer = document.querySelector('.ULPanel.RWHorizontal.OverviewPage');
        if (!tableContainer) {
            console.error("❌ Could not find the main table container.");
            return;
        }

        const selectedRow = tableContainer.querySelector('tr.Selected');
        if (!selectedRow) {
            console.error("❌ No row is selected. Please click on a row to select it first.");
            return;
        }

        const allRows = Array.from(tableContainer.querySelectorAll('tr'));
        const selectedRowIndex = allRows.indexOf(selectedRow);

        // 3. Determine the column indexes for 'Folder' and 'Definition'
        const headers = printTableHeaders();
        const folderIndex = headers.indexOf('Folder');
        const definitionIndex = headers.indexOf('Definition');

        if (folderIndex === -1 || definitionIndex === -1) {
            console.error("❌ Could not find the 'Folder' or 'Definition' column headers.");
            return;
        }

        // 4. Get the target folder name from the selected row
        const targetFolder = selectedRow.querySelectorAll('td')[folderIndex]?.textContent.trim();
        if (!targetFolder) {
            console.error("❌ Could not read the folder name from the selected row.");
            return;
        }
        console.log(`Target Folder: "${targetFolder}"`);
        console.log(`Processing up to and including Row Index: ${selectedRowIndex}`);

        // 5. Collect all unique, processed job names from matching folders
        const uniqueJobNames = new Set(); 

        // MODIFICATION: The loop now uses <= to include the selected row's index.
        for (let i = 0; i <= selectedRowIndex; i++) {
            const cells = allRows[i].querySelectorAll('td');
            if (cells.length > Math.max(folderIndex, definitionIndex)) {
                const currentFolder = cells[folderIndex].textContent.trim();
                
                if (currentFolder === targetFolder) {
                    let jobName = cells[definitionIndex].textContent.trim();
                    jobName = jobName.split(' ')[0];
                    uniqueJobNames.add(jobName);
                }
            }
        }

        // 6. Copy the final list to the clipboard
        if (uniqueJobNames.size > 0) {
            const textToCopy = Array.from(uniqueJobNames).join('\n');
            await navigator.clipboard.writeText(textToCopy);
            console.log(`✅ Success! Copied ${uniqueJobNames.size} unique job names to the clipboard. 📋`);
        } else {
            console.warn(`⚠️ No jobs found in the folder "${targetFolder}" up to your selected row.`);
        }

    } catch (error) {
        console.error("An unexpected error occurred:", error);
    }
}
  const copyButton = document.createElement('button');

  // Set the button's text content
  copyButton.textContent = "Copy Jobs";

  // Add some basic styling to the button to place it at the top of the page.
  // Using fixed positioning ensures it stays visible even when scrolling.
  copyButton.style.position = 'fixed';
  copyButton.style.top = '10px';
  copyButton.style.left = '140px';
  copyButton.style.zIndex = '9999';
  copyButton.style.padding = '8px 16px';
  copyButton.style.backgroundColor = '#4CAF50';
  copyButton.style.color = 'white';
  copyButton.style.border = 'none';
  copyButton.style.borderRadius = '5px';
  copyButton.style.cursor = 'pointer';

  // Add a hover effect for better user experience
  copyButton.addEventListener('mouseover', () => {
    copyButton.style.backgroundColor = '#45a049';
  });
  copyButton.addEventListener('mouseout', () => {
    copyButton.style.backgroundColor = '#4CAF50';
  });

  // Attach a click event listener to the button.
  // When clicked, it will execute the `copyMatchingJobsAboveSelected` function.
  copyButton.addEventListener('click', () => {
    copyMatchingJobsAboveSelected();
  });

  // Append the button to the body of the document
  document.body.appendChild(copyButton);
