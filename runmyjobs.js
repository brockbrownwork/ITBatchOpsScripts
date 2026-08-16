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

    // 2. Style the element
    toastElement.style.position = 'fixed';
    toastElement.style.top = '20px';
    toastElement.style.left = '50%';
    toastElement.style.transform = 'translateX(-50%)';
    toastElement.style.padding = '12px 24px';
    toastElement.style.backgroundColor = 'rgba(22, 163, 74, 0.85)'; // Green, semi-transparent
    toastElement.style.backdropFilter = 'blur(5px)'; // Frosted glass effect
    toastElement.style.color = 'white';
    toastElement.style.borderRadius = '8px';
    toastElement.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
    toastElement.style.zIndex = '9999';
    toastElement.style.opacity = '1';
    toastElement.style.transition = 'opacity 0.5s ease-out';
    toastElement.style.fontSize = '15px';
    toastElement.style.fontWeight = '600';

    // 3. Append to body
    document.body.appendChild(toastElement);

    // 4. Fade out
    setTimeout(() => {
        toastElement.style.opacity = '0';
    }, duration);

    // 5. Remove from DOM
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

const sleepers = ['RHRDSPRODTWS_JRDS_REPAIR_EST_OUTBOUND_ESI1', 'RHRDSPRODTWS_JRDS_REPAIR_OUTBOUND_PROCESS1'];

function checkJobNameAlerts(jobName) {
    if (jobName.split("_").pop().startsWith("ABAP")) {
        alert("ABAP job found, make sure that goes into DevOps chat. :)");
    }
    if (jobName.includes("ZFI_")) {
        alert("ZFI job found, make sure that goes into DevOps chat. :)");
    }
    if (jobName.endsWith("_CONT") || (jobName.endsWith("CNTRL"))) {
        alert("Warning: this probably contains a controller job, make sure to check to see if it has a controller page.");
    }
    if (sleepers.includes(jobName)) {
        alert("This job is a sleeper.");
    }
}

function getTableHeaders() {
    const headerElements = document.querySelectorAll('th');
    let headerTexts = [];
    headerElements.forEach(header => {
        headerTexts.push(header.textContent.trim());
    });
    headerTexts = headerTexts.slice(0, -1);
    return headerTexts;
}

/**
 * Finds the currently selected row, identifies its 'Folder', then finds all rows 
 * ABOVE it with the same folder. It processes the 'Definition' (job name) to
 * keep only the text before the first space. Finally, it copies the unique list
 * of processed job names to the clipboard.
 */
async function copyMatchingJobsAboveSelected() {
    try {
        console.log("Starting to populate jobs...");
        const tableContainer = document.querySelector('.ULPanel.RWHorizontal.OverviewPage');
        if (!tableContainer) {
            console.error("❌ Could not find the main table container.");
            return;
        }

        const selectedRow = tableContainer.querySelector('tr.Selected');
        if (!selectedRow) {
            console.error("❌ No row is selected. Please click on a row to select it first.");
            showToast("❌ No row selected!", 1500);
            return;
        }

        const allRows = Array.from(tableContainer.querySelectorAll('tr'));
        const selectedRowIndex = allRows.indexOf(selectedRow);

        const headers = getTableHeaders();
        const folderIndex = headers.indexOf('Folder');
        const definitionIndex = headers.indexOf('Definition');

        if (folderIndex === -1 || definitionIndex === -1) {
            console.error("❌ Could not find the 'Folder' or 'Definition' column headers.");
            return;
        }

        const targetFolder = selectedRow.querySelectorAll('td')[folderIndex]?.textContent.split("/")[0].trim();
        if (!targetFolder) {
            console.error("❌ Could not read the folder name from the selected row.");
            return;
        }
        console.log(`Target Folder: "${targetFolder}"`);

        const uniqueJobNames = new Set();

        for (let i = 0; i <= selectedRowIndex; i++) {
            const cells = allRows[i].querySelectorAll('td');
            if (cells.length > Math.max(folderIndex, definitionIndex)) {
                const currentFolder = cells[folderIndex].textContent.split("/")[0].trim();

                if (currentFolder === targetFolder) {
                    let jobName = cells[definitionIndex].textContent.trim();
                    jobName = jobName.split(' ')[0];
                    uniqueJobNames.add(jobName);
                    checkJobNameAlerts(jobName);
                }
            }
        }

        if (uniqueJobNames.size > 0) {
            const textToCopy = Array.from(uniqueJobNames).join('\n');
            await navigator.clipboard.writeText(textToCopy);
            console.log(`✅ Success! Copied ${uniqueJobNames.size} unique job names to the clipboard. 📋`);
            showToast(`✅ Copied ${uniqueJobNames.size} jobs to clipboard!`)
        } else {
            console.warn(`⚠️ No jobs found in the folder "${targetFolder}" up to your selected row.`);
            showToast("⚠️ No matching jobs found.", 1500);
        }

    } catch (error) {
        console.error("An unexpected error occurred:", error);
    }
}

// --- UI Button ---
const copyButton = document.createElement('button');
copyButton.textContent = "Copy Jobs";
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

copyButton.addEventListener('mouseover', () => {
    copyButton.style.backgroundColor = '#45a049';
});
copyButton.addEventListener('mouseout', () => {
    copyButton.style.backgroundColor = '#4CAF50';
});
copyButton.addEventListener('click', () => {
    copyMatchingJobsAboveSelected();
});

document.body.appendChild(copyButton);


// --- Job Monitoring Junk ---

let lastKnownLatestRunTime = null;
let runMonitorInterval = null;

function getColumnIndex(headerName) {
    const headers = getTableHeaders();
    const norm = s => s.replace(/\s+/g, ' ').trim().toLowerCase();
    const target = norm(headerName);
    let index = headers.findIndex(h => norm(h) === target);
    if (index === -1) {
        index = headers.findIndex(h => norm(h).includes(target));
    }
    return index;
}

/**
 * General time extractor. Tolerates:
 * - exotic whitespace (NBSP U+00A0, narrow NBSP U+202F) that Intl/UI frameworks
 *   insert before AM/PM
 * - any meridiem style: "a.m.", "AM", "am", "p. m.", or none (24-hour)
 * - optional seconds
 * - an optional explicit date or a "Today" label
 * Rejects anything not from today: "Yesterday", other relative-day words,
 * or an explicit date that isn't today's.
 */
function parseRunTime(timeString) {
    if (!timeString) return null;

    const normalized = timeString.replace(/[\s\u00a0\u2000-\u200a\u202f\u205f]+/g, ' ').trim();

    const timeMatch = normalized.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?: ?([ap])\.? ?m\.?)?/i);
    if (!timeMatch) return null;

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    const ampm = timeMatch[4] ? timeMatch[4].toLowerCase() : null;

    if (ampm === 'p' && hours !== 12) hours += 12;
    if (ampm === 'a' && hours === 12) hours = 0;
    if (hours > 23 || minutes > 59 || seconds > 59) return null;

    let base = new Date();
    const dateMatch = normalized.match(/\d{1,4}[\/.-]\d{1,2}[\/.-]\d{1,4}/);
    if (dateMatch) {
        const parsedDate = new Date(dateMatch[0]);
        if (!isNaN(parsedDate)) base = parsedDate;
    }

    // Only today's runs count. Any wordy leftovers besides the time and date
    // ("Yesterday", "2 days ago", ...) mean it's not from today — except "today".
    let leftover = normalized.replace(timeMatch[0], ' ');
    if (dateMatch) leftover = leftover.replace(dateMatch[0], ' ');
    leftover = leftover.replace(/[^a-z]+/gi, ' ').trim().toLowerCase();
    if (leftover && leftover !== 'today') return null;

    const now = new Date();
    if (base.getFullYear() !== now.getFullYear() ||
        base.getMonth() !== now.getMonth() ||
        base.getDate() !== now.getDate()) {
        return null;
    }

    return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes, seconds);
}

function getRandomString(list) {
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}

async function checkLatestRunTime() {
    console.log("Checking for new run times... 🔎");

    if (!debugMode) {
        clickRefreshButton();
        await delay(5000);
    }

    const runEndIndex = getColumnIndex('Run End');
    if (runEndIndex === -1) {
        console.error("❌ Could not find the 'Run End' column. Stopping check.");
        return;
    }

    const tableContainer = document.querySelector('.ULPanel.RWHorizontal.OverviewPage');
    if (!tableContainer) {
        console.error("❌ Could not find the main table container. Stopping check.");
        return;
    }

    const allRows = Array.from(tableContainer.querySelectorAll('tbody > tr'));
    let currentScanLatestTime = null;
    const unparsedSamples = [];

    for (const row of allRows) {
        const cells = row.querySelectorAll('td');
        if (cells.length > runEndIndex) {
            const cellText = cells[runEndIndex].textContent;
            const parsedTime = parseRunTime(cellText);

            if (parsedTime) {
                if (!currentScanLatestTime || parsedTime > currentScanLatestTime) {
                    currentScanLatestTime = parsedTime;
                }
            } else if (cellText.trim() && unparsedSamples.length < 3) {
                unparsedSamples.push(cellText);
            }
        }
    }

    if (!currentScanLatestTime && unparsedSamples.length > 0) {
        console.warn("⚠️ Run End cells had text but nothing parsed as a time. Raw samples (hidden chars visible):",
            unparsedSamples.map(s => JSON.stringify(s)));
    }

    if (currentScanLatestTime) {
        if (!lastKnownLatestRunTime || currentScanLatestTime > lastKnownLatestRunTime) {
            console.log(`✅ New latest run time found: ${currentScanLatestTime.toLocaleTimeString()}`);
            let greetings = ["Hark", "Alert", "Hello", "Heads up", "Whoa man", "Hey dude", "uh, like"];
            let greeting = getRandomString(greetings);
            try {
                const utterance = new SpeechSynthesisUtterance(`${greeting}, Check Run My Jobs`);
                window.speechSynthesis.speak(utterance);
            } catch (e) {
                console.error("Speech synthesis failed:", e);
            }
            lastKnownLatestRunTime = currentScanLatestTime;
        } else {
            console.log(`No new run times. Latest is still ${lastKnownLatestRunTime.toLocaleTimeString()}`);
        }
    } else {
        console.log("No parseable run times found in this scan.");
    }
}

function startRunMonitor() {
    if (runMonitorInterval) {
        console.log("Monitor is already running.");
        return;
    }
    console.log("Starting run monitor! Will check every minute or whatever... ⏱️");
    checkLatestRunTime();
    let checkInterval = 30;
    runMonitorInterval = setInterval(checkLatestRunTime, checkInterval * 1000);
}

// --- EVENT LISTENERS ---

// 1. The existing COPY event listener (Hijacks Ctrl+C if no text is selected)
document.addEventListener('copy', function(event) {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText.length === 0) {
        console.log("Copy event detected, but no text is selected. Preventing default copy.");
        event.preventDefault();
        copyMatchingJobsAboveSelected();
    } else {
        console.log(`Text selected: "${selectedText}". Allowing default copy action.`);
    }
});

// 2. NEW: Ctrl + Shift + C Listener
document.addEventListener('keydown', function(event) {
    // Check if Ctrl, Shift, and C are pressed simultaneously
    if (event.ctrlKey && event.shiftKey && (event.key === 'c' || event.key === 'C')) {
        console.log("Detected Ctrl+Shift+C shortcut.");
        
        // Prevent default browser behavior (usually opening DevTools)
        event.preventDefault();
        
        // Run the copy function
        copyMatchingJobsAboveSelected();
    }
});

startRunMonitor();

// 3. Paste Trimming Listener
/**
 * Function to handle the paste event, trim the text, and then paste it.
 */
function handlePaste(event) {
    event.preventDefault();
    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text/plain');
    const trimmedText = pastedText.trim();
    document.execCommand('insertText', false, trimmedText);
}

document.addEventListener('paste', handlePaste);
console.log("Document-wide paste handler attached. All pasted text will now be trimmed.");

/**
 * Copies ONLY the currently selected job's definition to the clipboard.
 * Triggered by Shift + Alt + C.
 */
async function copySingleSelectedJob() {
    try {
        // 1. Locate the main table container
        const tableContainer = document.querySelector('.ULPanel.RWHorizontal.OverviewPage');
        if (!tableContainer) return;

        // 2. Find the selected row
        const selectedRow = tableContainer.querySelector('tr.Selected');
        if (!selectedRow) {
            showToast("⚠️ No row is selected.");
            return;
        }

        // 3. Find the 'Definition' column index
        const headers = getTableHeaders();
        const definitionIndex = headers.indexOf('Definition');

        if (definitionIndex === -1) {
            console.error("❌ Could not find the 'Definition' column.");
            return;
        }

        // 4. Get the text from the specific cell
        const cells = selectedRow.querySelectorAll('td');
        let jobName = cells[definitionIndex]?.textContent.trim();

        if (jobName) {
            // Process the name (keep text before first space) to match your other logic
            jobName = jobName.split(' ')[0];

            // 5. Copy to clipboard
            await navigator.clipboard.writeText(jobName);
            console.log(`✅ Copied single job: ${jobName}`);
            showToast(`📋 Copied: ${jobName}`);

            checkJobNameAlerts(jobName);
        }

    } catch (error) {
        console.error("Error copying single job:", error);
    }
}

// --- Keydown Listener for Shift + Alt + C ---

document.addEventListener('keydown', function(event) {
    // Check if Shift and Alt are pressed, and the key is 'c' or 'C'
    if (event.shiftKey && event.altKey && (event.key === 'c' || event.key === 'C')) {
        // Prevent any default browser behavior for this combo
        event.preventDefault();
        
        console.log("Detected Shift + Alt + C");
        copySingleSelectedJob();
    }
});