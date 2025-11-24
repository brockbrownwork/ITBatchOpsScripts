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
        return []; // Return an empty array if the column isn't found
    }

    // 2. Locate the main table container
    const tableContainer = document.querySelector('.ULPanel.RWHorizontal.OverviewPage');
    if (!tableContainer) {
        console.error("❌ Could not find the main table container.");
        return []; // Return an empty array if the table isn't found
    }

    // 3. Get all data rows (using 'tbody > tr' is safer to skip header rows)
    const allRows = Array.from(tableContainer.querySelectorAll('tbody > tr'));
    
    // 4. Extract the text from the 'Definition' cell for each row
    const ServerNames = allRows
        .map(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > definitionIndex) {
                // Get the full text content of the cell and trim whitespace
                return cells[definitionIndex].textContent.trim();
            }
            return null; // Handle rows that might be malformed
        })
        .filter(name => name !== null && name !== ""); // Filter out any null or empty strings

    return ServerNames;
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

// --- Start of Monitoring Logic ---

// Stores the Servers from the previous check. Using a Set for fast lookups.
let previousServers = new Set(getAllServerNames());

/**
 * The main function that checks for new Servers and triggers alerts.
 */
async function checkServers() {
    const currentServersList = await getAllServerNames();
    console.log(`📎 Servers currently in list:\n${currentServersList}`);
    
    // Find Servers that are in the new list but not in the old one
    const newServers = currentServersList.filter(Server => !previousServers.has(Server));

    if (newServers.length > 0) {
        console.log("New Servers detected:", newServers);
        // We found new Servers! Trigger the alerts.
        triggerAlerts(newServers);
    }

    // Update the state for the next check
    previousServers = new Set(currentServersList);
}

/**
 * Triggers the TTS and Notification alerts.
 */
function triggerAlerts(newServers) {
    // Format the Server list for the message
    // This creates a string like "Server_a and Server_b"
    const ServerListString = newServers.join(' and ');
    
    // Create the message based on your request
    const message = `The following servers have error statuses: ${ServerListString}`;

    // 1. Speak the message
    speak(message);
    console.log(message);
    
    // 2. Show the notification
    showNotification("Server Error Alert", message);
}


// --- Helper Functions ---

/**
 * Uses the Web Speech API to speak the provided text.
 */
function speak(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        // You can configure voice, pitch, rate here if desired
        // utterance.voice = ...;
        // utterance.rate = 1;
        window.speechSynthesis.speak(utterance);
    } else {
        console.error("Browser does not support Speech Synthesis.");
    }
}

/**
 * Uses the Notification API to show a desktop notification.
 */
function showNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            // You can add an icon here
            // icon: "path/to/icon.png" 
        });
    } else {
        console.warn("Notification permission is not granted.");
    }
}

/**
 * Kicks off the poller.
 */
function startServerMonitoring() {
    console.log("Starting server monitor...");
    
    // Check immediately, then start the interval
    checkServers(); 
    
    // Set the poller to check every 30 seconds
    setInterval(checkServers, 1000 * 30);
}


/**
 * Asks the user for permission to display desktop notifications.
 * @returns {Promise<string>} A promise that resolves with the permission status ('granted', 'denied', or 'default').
 */
function requestNotificationPermission() {
  // Check if the browser supports the Notification API
  if (!('Notification' in window)) {
    console.warn("This browser does not support desktop notifications.");
    // Return 'unsupported' status for clarity, though technically not a standard status
    return Promise.resolve('unsupported'); 
  }

  // If permission has already been granted, we don't need to ask again
  if (Notification.permission === 'granted') {
    console.log("Notification permission already granted.");
    return Promise.resolve('granted');
  }

  // If permission is 'denied', we cannot ask the user again unless they change it in their browser settings
  if (Notification.permission === 'denied') {
    console.warn("Notification permission is permanently denied by the user.");
    return Promise.resolve('denied');
  }

  // Request permission from the user
  return Notification.requestPermission().then(permission => {
    // The promise resolves with the new permission status
    console.log(`Notification permission status: ${permission}`);
    return permission;
  });
}

requestNotificationPermission();
startServerMonitoring();

// --- End of Monitoring Logic ---