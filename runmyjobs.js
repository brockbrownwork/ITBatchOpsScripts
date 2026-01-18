/**
 * --- CONFIGURATION ---
 * Add job names here that you want the monitor to completely ignore.
 */
const ignoredJobNames = [
    "SP_edp_SIGNET_FLASH_SALES_TBL"
];

/**
 * --- STATE TRACKING ---
 */
// Stores unique job names (Definitions) of Console jobs we have already alerted on.
const alertedConsoleJobs = new Set(); 

// Global variable to store the most recent time found across all checks.
let lastKnownLatestRunTime = null;

// Global variable to hold the interval ID so we can stop it later.
let runMonitorInterval = null;


// --- HELPER FUNCTIONS ---

function showToast(message, duration = 3000) {
    const toastElement = document.createElement('div');
    toastElement.textContent = message;

    // Style the element
    toastElement.style.position = 'fixed';
    toastElement.style.top = '20px';
    toastElement.style.left = '50%';
    toastElement.style.transform = 'translateX(-50%)';
    toastElement.style.padding = '12px 24px';
    toastElement.style.backgroundColor = 'rgba(22, 163, 74, 0.95)'; // Green
    toastElement.style.backdropFilter = 'blur(5px)';
    toastElement.style.color = 'white';
    toastElement.style.borderRadius = '8px';
    toastElement.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
    toastElement.style.zIndex = '9999';
    toastElement.style.opacity = '1';
    toastElement.style.transition = 'opacity 0.5s ease-out';
    toastElement.style.fontSize = '15px';
    toastElement.style.fontWeight = '600';

    document.body.appendChild(toastElement);

    setTimeout(() => { toastElement.style.opacity = '0'; }, duration);
    setTimeout(() => { 
        if (document.body.contains(toastElement)) {
            document.body.removeChild(toastElement); 
        }
    }, duration + 500);
}

function clickRefreshButton() {
    const targetButton = document.querySelector('.ULButton.RWItem:has(span.ULButton-Icon.IMAGE_RWGENERAL_REFRESH)');
    if (targetButton) {
        targetButton.click();
        console.log('✅ Clicked the refresh button.');
    } else {
        console.warn('Refresh button not found.');
    }
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
    const headerElements = document.querySelectorAll('th');
    let headerTexts = [];
    headerElements.forEach(header => {
        headerTexts.push(header.textContent.trim());
    });
    // Remove the last empty header usually found in these tables
    return headerTexts.slice(0, -1);
}

function getColumnIndex(headerName) {
    const headers = getTableHeaders();
    return headers.indexOf(headerName);    
}

function parseRunTime(timeString) {
    const trimmedString = timeString.trim();
    const timeRegex = /^(\d{1,2}):(\d{2}):(\d{2}) (a\.m\.)$/i;
    const match = trimmedString.match(timeRegex);

    if (!match) return null;

    try {
        let [, hours, minutes, seconds, ampm] = match;
        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10);
        seconds = parseInt(seconds, 10);
        ampm = ampm.toLowerCase();

        if (ampm.startsWith('p') && hours !== 12) hours += 12;
        if (ampm.startsWith('a') && hours === 12) hours = 0;

        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds);
    } catch (e) {
        console.error(`Error parsing time: "${trimmedString}"`, e);
        return null;
    }
}

// --- CORE MONITORING LOGIC ---

async function checkLatestRunTime() {
    console.log("Checking for updates... 🔎");

    if (!debugMode) {
        clickRefreshButton();
        await delay(5000);
    }

    // 1. Get Column Indices
    const runEndIndex = getColumnIndex('Run End');
    const definitionIndex = getColumnIndex('Definition');
    const statusIndex = getColumnIndex('Status');

    if (definitionIndex === -1) {
        console.error("❌ Could not find 'Definition' column. Stopping check.");
        return;
    }

    // 2. Locate the main table
    const tableContainer = document.querySelector('.ULPanel.RWHorizontal.OverviewPage');
    if (!tableContainer) return;
    
    const allRows = Array.from(tableContainer.querySelectorAll('tbody > tr'));
    
    let currentScanLatestTime = null;
    let triggerAlert = false;
    let alertReason = "";

    // 3. Iterate rows
    for (const row of allRows) {
        const cells = row.querySelectorAll('td');
        
        // Ensure we have enough cells
        if (cells.length < Math.max(runEndIndex, definitionIndex, statusIndex)) continue;

        // Get Data
        const jobName = cells[definitionIndex].textContent.trim();
        const statusText = cells[statusIndex]?.textContent.trim() || "";
        const runEndTimeText = (runEndIndex > -1) ? cells[runEndIndex].textContent : "";

        // --- IGNORE CHECK ---
        // If the job name is in our ignore list, skip this row entirely
        if (ignoredJobNames.includes(jobName)) {
            continue;
        }

        // --- CHECK A: CONSOLE STATUS ---
        // Check if status contains "Console" (case insensitive)
        if (statusText.toLowerCase().includes("console")) {
            // Check if we have already alerted for this specific job name
            if (!alertedConsoleJobs.has(jobName)) {
                console.log(`⚠️ New Console Job found: ${jobName}`);
                alertedConsoleJobs.add(jobName); // Add to set so we don't alert again
                triggerAlert = true;
                alertReason = "Console Job Detected";
                showToast(`⚠️ Console Status: ${jobName}`);
            }
        }

        // --- CHECK B: RUN TIME ---
        const parsedTime = parseRunTime(runEndTimeText);
        if (parsedTime) {
            if (!currentScanLatestTime || parsedTime > currentScanLatestTime) {
                currentScanLatestTime = parsedTime;
            }
        }
    }

    // 4. Determine if we need to alert based on Time
    if (currentScanLatestTime) {
        if (!lastKnownLatestRunTime || currentScanLatestTime > lastKnownLatestRunTime) {
            console.log(`✅ New latest run time: ${currentScanLatestTime.toLocaleTimeString()}`);
            lastKnownLatestRunTime = currentScanLatestTime;
            triggerAlert = true; // Alert because time updated
        }
    }

    // 5. Speak if necessary
    if (triggerAlert) {
        try {
            const utterance = new SpeechSynthesisUtterance("Hark, Check Run My Jobs");
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error("Speech synthesis failed:", e);
        }
    } else {
        console.log("No new relevant updates (Time or new Console jobs).");
    }
}

function startRunMonitor() {
    if (runMonitorInterval) {
        console.log("Monitor is already running.");
        return;
    }
    
    console.log("Starting monitor... ⏱️");
    checkLatestRunTime();
    let checkInterval = 30; 
    runMonitorInterval = setInterval(checkLatestRunTime, checkInterval * 1000); 
}

// --- CLIPBOARD LOGIC (Unchanged but included for completeness) ---

async function copyMatchingJobsAboveSelected() {
    try {
        const tableContainer = document.querySelector('.ULPanel.RWHorizontal.OverviewPage');
        const selectedRow = tableContainer.querySelector('tr.Selected');
        if (!selectedRow) return;

        const allRows = Array.from(tableContainer.querySelectorAll('tr'));
        const selectedRowIndex = allRows.indexOf(selectedRow);

        const headers = getTableHeaders();
        const folderIndex = headers.indexOf('Folder');
        const definitionIndex = headers.indexOf('Definition');
        const targetFolder = selectedRow.querySelectorAll('td')[folderIndex]?.textContent.split("/")[0].trim();

        const uniqueJobNames = new Set(); 

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

        if (uniqueJobNames.size > 0) {
            const textToCopy = Array.from(uniqueJobNames).join('\n');
            await navigator.clipboard.writeText(textToCopy);
            showToast(`✅ Copied ${uniqueJobNames.size} jobs to clipboard.`)
        }

    } catch (error) {
        console.error("Error in copy function:", error);
    }
}

// --- UI BUTTONS & LISTENERS ---

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

copyButton.addEventListener('click', () => { copyMatchingJobsAboveSelected(); });
document.body.appendChild(copyButton);

document.addEventListener('copy', function(event) {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText.length === 0) {
        event.preventDefault();
        copyMatchingJobsAboveSelected();
    }
});

function handlePaste(event) {
    event.preventDefault();
    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text/plain');
    const trimmedText = pastedText.trim();
    document.execCommand('insertText', false, trimmedText);
}
document.addEventListener('paste', handlePaste);

// Start the monitor
startRunMonitor();