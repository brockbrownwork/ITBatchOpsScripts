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



function showToast(message, duration = 1000) {

    // 1. Create the element

    const toastElement = document.createElement('div');

    toastElement.textContent = message;



    // 2. Style the element to be a non-intrusive, modern-looking popup

    toastElement.style.position = 'fixed';

    toastElement.style.top = '20px';

    toastElement.style.left = '50%';

    toastElement.style.transform = 'translateX(-50%)';

    toastElement.style.padding = '12px 24px';

    

    // --- MODIFIED LINE: Changed to a semi-transparent green (Tailwind green-600 equivalent) ---

    toastElement.style.backgroundColor = 'rgba(22, 163, 74, 0.85)'; // Green, semi-transparent

    

    toastElement.style.backdropFilter = 'blur(5px)'; // Frosted glass effect

    toastElement.style.color = 'white';

    toastElement.style.borderRadius = '8px';

    toastElement.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)'; // Enhanced shadow

    toastElement.style.zIndex = '9999'; // Ensure it's on top of everything

    toastElement.style.opacity = '1';

    toastElement.style.transition = 'opacity 0.5s ease-out'; // Smooth fade-out transition

    toastElement.style.fontSize = '15px';

    toastElement.style.fontWeight = '600'; // Make text bolder



    // 3. Append it to the body

    document.body.appendChild(toastElement);



    // 4. Set a timeout to start the fade-out process

    setTimeout(() => {

        toastElement.style.opacity = '0';

    }, duration);



    // 5. Set another timeout to remove the element from the DOM after the transition completes

    // The delay is the duration of visibility plus the duration of the fade-out animation (500ms)

    setTimeout(() => {

        if (document.body.contains(toastElement)) {

            document.body.removeChild(toastElement);

        }

    }, duration + 500);

}



var debugMode = false;

function toggleDebugMode() {

    debugMode = !debugMode;

    console.log("Debug mode is now", debugMode ? "on" : "off");

}



function delay(ms) {

    return new Promise(resolve => setTimeout(resolve, ms));

}



function getTableHeaders() {

    // 1. Get all <th> elements on the page.

    const headerElements = document.querySelectorAll('th');



    // 2. Create an empty array to store the text content.

    let headerTexts = [];

    

    // 3. Loop through the NodeList of elements and push the text content to the array.

    headerElements.forEach(header => {

        headerTexts.push(header.textContent.trim());

    });



    headerTexts = headerTexts.slice(0, -1);

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

        const headers = getTableHeaders();

        const folderIndex = headers.indexOf('Folder');

        const definitionIndex = headers.indexOf('Definition');



        if (folderIndex === -1 || definitionIndex === -1) {

            console.error("❌ Could not find the 'Folder' or 'Definition' column headers.");

            return;

        }



        // 4. Get the target folder name from the selected row

        const targetFolder = selectedRow.querySelectorAll('td')[folderIndex]?.textContent.split("/")[0].trim();

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

                const currentFolder = cells[folderIndex].textContent.split("/")[0].trim();

                

                if (currentFolder === targetFolder) {

                    let jobName = cells[definitionIndex].textContent.trim();

                    jobName = jobName.split(' ')[0];

                    uniqueJobNames.add(jobName);

                    if (jobName.split("_").pop().startsWith("ABAP")) {

                        alert("ABAP job found, make sure that goes into DevOps chat. :)")

                    }

                }

            }

        }



        // 6. Copy the final list to the clipboard

        if (uniqueJobNames.size > 0) {

            const textToCopy = Array.from(uniqueJobNames).join('\n');

            await navigator.clipboard.writeText(textToCopy);

            console.log(`✅ Success! Copied ${uniqueJobNames.size} unique job names to the clipboard. 📋`);

            showToast(`✅ Success! Copied ${uniqueJobNames.size} unique job names to the clipboard. 📋`)

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



// job monitoring junk under here...



/**

 * Global variable to store the most recent time found across all checks.

 * We use null to know if it's the first run.

 */

let lastKnownLatestRunTime = null;



/**

 * Global variable to hold the interval ID so we can stop it later.

 */

let runMonitorInterval = null;



/**

 * Helper function to find the index of a column by its header text.

 * This is based on the getTableHeaders() call in your function.

 * It includes a fallback in case getTableHeaders() isn't available.

 * @param {string} headerName - The name of the header to find (e.g., "Run End").

 * @returns {number} The column index, or -1 if not found.

 */

function getColumnIndex(headerName) {

    let index = -1;

    const headers = getTableHeaders();

    index = headers.indexOf(headerName);    

    return index;

}



/**

 * Helper function to parse a time string (e.g., "1:30:45 p.m.")

 * into a full Date object for comparison.

 * It now strictly enforces the format and ignores other strings.

 * @param {string} timeString - The text from the table cell.

 * @returns {Date | null} A Date object or null if parsing fails.

 */

function parseRunTime(timeString) {

    // First, trim whitespace from the beginning and end of the string.

    const trimmedString = timeString.trim();



    // Regex is now "anchored" with ^ at the start and $ at the end.

    // This forces it to match the *entire* string, not just a part of it.

    // So, "Yesterday 10:54:06 p.m." will NOT match.

    const timeRegex = /^(\d{1,2}):(\d{2}):(\d{2}) (a\.m\.)$/i;

    const match = trimmedString.match(timeRegex);



    if (!match) {

        return null; // String doesn't exactly match the required format

    }



    try {

        let [, hours, minutes, seconds, ampm] = match;

        hours = parseInt(hours, 10);

        minutes = parseInt(minutes, 10);

        seconds = parseInt(seconds, 10);

        ampm = ampm.toLowerCase();



        // Convert 12-hour to 24-hour

        if (ampm.startsWith('p') && hours !== 12) {

            hours += 12; // 1 PM -> 13

        }

        if (ampm.startsWith('a') && hours === 12) {

            hours = 0; // 12 AM -> 0

        }



        // Create a Date object for today with the parsed time

        const today = new Date();

        return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds);

    } catch (e) {

        console.error(`Error parsing time: "${trimmedString}"`, e);

        return null;

    }

}





/**

 * This is the core function that runs every 60 seconds.

 * It scans the "Run End" column, finds the latest time,

 * and compares it to the last known latest time.

 */

async function checkLatestRunTime() {

    console.log("Checking for new run times... 🔎");



    if (!debugMode) {

        clickRefreshButton();

        await delay(5000);

    }



    // 1. Find the "Run End" column index

    const runEndIndex = getColumnIndex('Run End');

    const definitionIndex = getColumnIndex('Definition');

    if (runEndIndex === -1) {

        console.error("❌ Could not find the 'Run End' column. Stopping check.");

        return;

    }



    // 2. Locate the main table and rows

    const tableContainer = document.querySelector('.ULPanel.RWHorizontal.OverviewPage');

    if (!tableContainer) {

        console.error("❌ Could not find the main table container. Stopping check.");

        return;

    }

    

    // Get all data rows

    const allRows = Array.from(tableContainer.querySelectorAll('tbody > tr'));

    let currentScanLatestTime = null;



    // 3. Iterate all rows to find the latest time in this scan

    for (const row of allRows) {

        const cells = row.querySelectorAll('td');

        if (cells.length > runEndIndex) {

            const cellText = cells[runEndIndex].textContent;

            

            

            // Use the new, stricter parsing function

            const parsedTime = parseRunTime(cellText);



            // Only proceed if parsing was successful (i.e., format was correct)

            if (parsedTime) {

                // Check if this time is the latest *in this scan*

                if (!currentScanLatestTime || parsedTime > currentScanLatestTime) {

                    currentScanLatestTime = parsedTime;

                }

            }

        }

    }



    // 4. Compare this scan's latest time to the global "last known" time

    if (currentScanLatestTime) {

        // We found a valid time. Check if it's new.

        if (!lastKnownLatestRunTime || currentScanLatestTime > lastKnownLatestRunTime) {

            console.log(`✅ New latest run time found: ${currentScanLatestTime.toLocaleTimeString()}`);

            

            // 5. Use Text-to-Speech to say the message

            try {

                const utterance = new SpeechSynthesisUtterance("Hark, Check Run My Jobs");

                window.speechSynthesis.speak(utterance);

            } catch (e) {

                console.error("Speech synthesis failed:", e);

            }



            // 6. Update the global "last known" time to this new time

            lastKnownLatestRunTime = currentScanLatestTime;

            

        } else {

            // No new time, the latest we see is the same as before.

            console.log(`No new run times. Latest is still ${lastKnownLatestRunTime.toLocaleTimeString()}`);

        }

    } else {

        // No times in the correct format were found in this scan.

        console.log("No run times in 'HH:MM:SS a.m.' format found in this scan.");

    }

}