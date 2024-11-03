// Initialize the Audio Context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Pre-initialize the oscillator and gain node
const preOscillator = audioCtx.createOscillator();
preOscillator.type = 'sine'; // You can choose other types like 'square', 'triangle', etc.
preOscillator.frequency.value = 220; // Default frequency

const preGain = audioCtx.createGain();
preGain.gain.setValueAtTime(0.01, audioCtx.currentTime); // Start with gain at 0.01 (near silent)

// Connect the oscillator to the gain node and the gain node to the destination
preOscillator.connect(preGain);
preGain.connect(audioCtx.destination);

// Start the oscillator immediately
preOscillator.start();

// Beep function to trigger the beep with fade-in and fade-out
function beep(duration = 200, frequency = 220, volume = 1) {
    // Resume the AudioContext if it's suspended (required for some browsers)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Update the frequency if it's different from the current one
    if (preOscillator.frequency.value !== frequency) {
        preOscillator.frequency.setValueAtTime(frequency, now);
    }

    // Define fade-in and fade-out durations in seconds
    const fadeInTime = 0.05;  // 50 milliseconds
    const fadeOutTime = 0.05; // 50 milliseconds

    // Convert duration from milliseconds to seconds
    const totalDuration = duration / 1000;

    // Calculate the times for fade-in and fade-out
    const fadeInEnd = now + fadeInTime;
    const fadeOutStart = now + totalDuration - fadeOutTime;
    const beepEnd = now + totalDuration;

    // Cancel any previously scheduled gain changes to prevent overlap
    preGain.gain.cancelScheduledValues(now);

    // Schedule the gain to ramp up smoothly (fade-in)
    preGain.gain.setValueAtTime(preGain.gain.value, now);
    preGain.gain.linearRampToValueAtTime(volume, fadeInEnd);

    // Maintain the volume until it's time to fade out
    preGain.gain.setValueAtTime(volume, fadeOutStart);

    // Schedule the gain to ramp down smoothly (fade-out)
    preGain.gain.linearRampToValueAtTime(0, beepEnd);
}

// Notify function to trigger multiple beeps at specified intervals
function notify() {
    // Call beep immediately
    beep();

    // Schedule the second beep after 1 second (1000 ms)
    setTimeout(() => {
        beep();
    }, 1000);

    // Schedule the third beep after 2 seconds (2000 ms)
    setTimeout(() => {
        beep();
    }, 2000);

    // Schedule the fourth beep after 3 seconds (3000 ms)
    setTimeout(() => {
        beep();
    }, 3000);
}

(function() {
    // Store the initial document text
    let previousText = document.body.innerText;

    // Function to check the document text and click the button
    function checkAndRefresh() {
        // Find the first input element of type button with the text "Refresh"
        const refreshButton = Array.from(document.querySelectorAll('input[type="button"]'))
            .find(button => button.value === "Refresh");

        if (refreshButton) {
            // Click the button
            refreshButton.click();
        } else {
            console.log("Refresh button not found");
            return;
        }

        // Wait a bit for the page content to potentially change after clicking the button
        setTimeout(() => {
            const currentText = document.body.innerText;

            // Check if the document text has changed
            if (currentText !== previousText) {
                previousText = currentText; // Update the stored text
                notify(); // Call the notify function (user-defined)
            }
        }, 2000); // Adjust the delay as needed to allow for content loading
    }

    // Run the function every 10 seconds
    setInterval(checkAndRefresh, 10000);
})();
