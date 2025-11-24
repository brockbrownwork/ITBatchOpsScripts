/**
 * Scans the main Server table and returns a list of all Server names
 * from the 'Definition' column.
 */
function getAllServerNames() {
    // 1. Find the 'Definition' column index by using the existing getTableHeaders function
    const headers = getTableHeaders();
    const definitionIndex = headers.indexOf('Name');

    if (definitionIndex === -1) {
        console.error("❌ Could not find the 'Name' column header.");
        return []; 
    }

    // 2. Locate the main table container
    const tableContainer = document.querySelector('.ULPanel.RWHorizontal.OverviewPage');
    if (!tableContainer) {
        console.error("❌ Could not find the main table container.");
        return []; 
    }

    // 3. Get all data rows
    const allRows = Array.from(tableContainer.querySelectorAll('tbody > tr'));
    
    // 4. Extract the text
    const ServerNames = allRows
        .map(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > definitionIndex) {
                return cells[definitionIndex].textContent.trim();
            }
            return null; 
        })
        .filter(name => name !== null && name !== ""); 

    return ServerNames;
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

// --- Start of Monitoring Logic ---

// Configuration for the debounce/verification
const VERIFICATION_DELAY_MS = 4000; // Wait 4 seconds between verification checks

// Stores the Servers from the previous check.
let previousServers = new Set(getAllServerNames());

/**
 * Helper function to pause execution for a set time
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * The main function that checks for new Servers and triggers alerts.
 */
async function checkServers() {
    console.log("🔍 Checking server list...");
    
    // --- CHECK 1 (Initial) ---
    const list1 = await getAllServerNames();
    
    // Check if there are any NEW servers compared to our saved state
    const newInList1 = list1.filter(Server => !previousServers.has(Server));

    // If no changes found immediately, just update our baseline and exit
    if (newInList1.length === 0) {
        previousServers = new Set(list1);
        return;
    }

    console.warn(`⚠️ Potential change detected (${newInList1.length} new). Verifying 3 times to ensure it is not a glitch...`);

    // --- CHECK 2 (Verification) ---
    await wait(VERIFICATION_DELAY_MS); // Wait a moment
    const list2 = await getAllServerNames();
    const newInList2 = list2.filter(Server => !previousServers.has(Server));

    if (newInList2.length === 0) {
        console.log("Create false alarm: List reverted on 2nd check.");
        return; // Stop, it was a glitch
    }

    // --- CHECK 3 (Final Confirmation) ---
    await wait(VERIFICATION_DELAY_MS); // Wait a moment
    const list3 = await getAllServerNames();
    const newInList3 = list3.filter(Server => !previousServers.has(Server));

    if (newInList3.length === 0) {
        console.log("False alarm: List reverted on 3rd check.");
        return; // Stop, it was a glitch
    }

    // --- CONFIRMED ---
    // If we get here, the new servers persisted across all 3 checks.
    console.log("✅ Change confirmed. Triggering alerts.");
    triggerAlerts(newInList3);

    // Update the state for the next monitoring cycle
    previousServers = new Set(list3);
}

/**
 * Triggers the TTS and Notification alerts.
 */
function triggerAlerts(newServers) {
    const ServerListString = newServers.join('\n');
    const message = `The following servers have error statuses:\n${ServerListString}`;

    speak(message);
    console.log(message);
    showNotification("Server Error Alert", message);
}


// --- Helper Functions ---

function speak(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    } else {
        console.error("Browser does not support Speech Synthesis.");
    }
}

function showNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: body });
    } else {
        console.warn("Notification permission is not granted.");
    }
}

function startServerMonitoring() {
    console.log("Starting server monitor...");
    checkServers(); 
    // Check every 30 seconds
    setInterval(checkServers, 1000 * 30);
}

function requestNotificationPermission() {
  if (!('Notification' in window)) return Promise.resolve('unsupported'); 
  if (Notification.permission === 'granted') return Promise.resolve('granted');
  if (Notification.permission === 'denied') return Promise.resolve('denied');

  return Notification.requestPermission().then(permission => {
    return permission;
  });
}

requestNotificationPermission();
startServerMonitoring();