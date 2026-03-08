// Configuration
const checkIntervalMs = 5000; // Checks every 5 seconds. Adjust as needed.
const threshold = 2.0;        // The degree rise threshold to trigger TTS

// State tracking
const initialTemps = {};
const hasAlerted = {};

// Helper to generate the CSS selector dynamically
function getSelector(i) {
    return `#scroll-container > div.css-35kj3g > div:nth-child(2) > div.css-oeyyhq > div > div > div:nth-child(${i}) > div > div > div > div > div > div:nth-child(3) > div.css-1mnq28f > div.css-v9urze`;
}

// Helper to extract only numbers and periods from text
function extractTemperature(text) {
    if (!text) return null;
    // Regex matches consecutive digits and periods
    const match = text.match(/[0-9.]+/);
    return match ? parseFloat(match[0]) : null;
}

// Helper to trigger Text-to-Speech
function speak(message) {
    console.log("🎙️ TTS Triggered:", message);
    const utterance = new SpeechSynthesisUtterance(message);
    window.speechSynthesis.speak(utterance);
}

// Main monitoring function
function monitorTemperatures() {
    for (let i = 1; i <= 5; i++) {
        const element = document.querySelector(getSelector(i));
        
        if (!element) {
            console.warn(`[Monitor] Element for temperature ${i} not found on the page yet.`);
            continue;
        }

        const rawText = element.textContent || element.innerText;
        const currentTemp = extractTemperature(rawText);

        if (currentTemp === null || isNaN(currentTemp)) {
            console.warn(`[Monitor] Could not parse a number from temp ${i}. Raw text: "${rawText}"`);
            continue;
        }

        // Record the original temperature if it's the first time we're seeing it
        if (initialTemps[i] === undefined) {
            initialTemps[i] = currentTemp;
            console.log(`✅ Recorded initial temperature ${i}: ${currentTemp}`);
            continue;
        }

        // Calculate the difference
        const tempDifference = currentTemp - initialTemps[i];

        // Check if it exceeds the 2-degree threshold
        if (tempDifference > threshold) {
            // Check if we already triggered an alert for this spike to prevent TTS spam
            if (!hasAlerted[i]) {
                const alertMessage = `Warning. Temperature ${i} has risen by more than two degrees. It is currently at ${currentTemp}.`;
                speak(alertMessage);
                hasAlerted[i] = true; // Mark as alerted
            }
        } else if (tempDifference <= threshold && hasAlerted[i]) {
            // Optional: Reset the alert flag if the temperature drops back down
            hasAlerted[i] = false;
            console.log(`ℹ️ Temperature ${i} has dropped back below the threshold.`);
        }
    }
}

// Initialize the monitor
console.log("🚀 Starting temperature monitor...");
monitorTemperatures(); // Run once immediately
const monitorInterval = setInterval(monitorTemperatures, checkIntervalMs);

// Note: To stop the script later, you can type `clearInterval(monitorInterval)` in the console.