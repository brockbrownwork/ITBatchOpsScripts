// ==UserScript==
// @name         Autosys Alert Notifier
// @namespace    https://jewels.com/
// @version      2025-02-01
// @description  try to take over the world!
// @author       You
// @match        https://autosys-ui.auto.cloud.jewels.com/wcc/ui/Launcher.html?*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        window.onurlchange
// @run-at       document-start

// ==/UserScript==

(function() {
    'use strict';
    console.log("hmmm....");

    const wait10Seconds = () => {

        return new Promise(resolve => {
            setTimeout(resolve, 10000);
        });
    };

    console.log("Waiting...");
    // Alternative usage with .then()
    wait10Seconds().then(() => {
        let url = document.URL;
        if (url.startsWith("https://autosys-ui.auto.cloud.jewels.com/wcc/ui/Launcher.html?app=Monitoring&") && url.endsWith("#eventlist:")) {
            console.log("Waited 10 seconds...");
        // Initialize the Audio Context
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Pre-initialize the oscillator and gain node
        const preOscillator = audioCtx.createOscillator();
        preOscillator.type = 'sine'; // You can choose other types like 'square', 'triangle', etc.
        preOscillator.frequency.value = 220; // Default frequency

        const preGain = audioCtx.createGain();
        preGain.gain.setValueAtTime(0, audioCtx.currentTime); // Start with gain at 0 (silent)

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

        function findRepeatJobs(text) {
            const lines = text.split('\n');
            const jobNames = [];
            const jobCounts = {};
            const duplicates = [];
            const statusKeywords = ['Acknowledged', 'Open'];

            for (let i = 0; i < lines.length; i++) {
            if (statusKeywords.includes(lines[i].trim())) {
                const jobName = lines[i + 1]?.trim();
                if (jobName) {
                // Figure out if the job is a dba archive or a dba backup
                // Count the occurrences of each job name
                jobCounts[jobName] = (jobCounts[jobName] || 0) + 1;

                // If a job appears more than once, add it to duplicates
                if (jobCounts[jobName] === 2) {
                    duplicates.push(jobName);
                }

                // Add unique job names to the array
                if (!jobNames.includes(jobName)) {
                    jobNames.push(jobName);
                }
                }
            }
            }

            // Alert if any duplicates are found
            if (duplicates.length > 0) {
            notify();
            alert('Duplicate job names found: ' + duplicates.join(', '));
            }

            return jobNames;
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
            // Create a container for the buttons to ensure proper spacing
            var buttonContainer = document.createElement('div');
            buttonContainer.style.width = '100%';
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'center';
            buttonContainer.style.padding = '10px 0';
            buttonContainer.style.backgroundColor = '#f8f9fa'; // Light background to differentiate the button area
            buttonContainer.style.gap = '10px'; // Space between buttons

            // Function to create a button with specified text
            function createButton(text) {
                var button = document.createElement('button');
                button.textContent = text;
                button.style.padding = '10px 20px';
                button.style.fontSize = '16px';
                button.style.color = '#fff';
                button.style.backgroundColor = '#007bff'; // Bootstrap primary blue
                button.style.border = 'none';
                button.style.borderRadius = '5px';
                button.style.cursor = 'pointer';
                button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                button.style.transition = 'background-color 0.3s, transform 0.2s';

                // Hover effects
                button.addEventListener('mouseenter', function() {
                    button.style.backgroundColor = '#0056b3'; // Darker blue on hover
                    button.style.transform = 'translateY(-2px)';
                });

                button.addEventListener('mouseleave', function() {
                    button.style.backgroundColor = '#007bff'; // Original blue
                    button.style.transform = 'translateY(0)';
                });

                return button;
            }

            // Create the "Copy critical jobs" button
            var copyJobsButton = createButton('Copy jobs');

            // Create the "Copy predefined text" button
            var copyPredefinedButton = createButton('Copy critical jobs');

            // Append both buttons to the container
            buttonContainer.appendChild(copyJobsButton);
            buttonContainer.appendChild(copyPredefinedButton);

            // Insert the button container at the very top of the body
            document.body.insertBefore(buttonContainer, document.body.firstChild);

            // Function to get the visible text from the document
            function getVisibleTextFromDocument() {
                window.getSelection().removeAllRanges();  // Clear any existing selection

                let range = document.createRange();       // Create a new range
                range.selectNode(document.body);          // Select the entire body of the document

                window.getSelection().addRange(range);    // Add the range to the current selection

                let visibleText = window.getSelection().toString().trim();  // Get the visible text and trim whitespace
                window.getSelection().removeAllRanges();   // Clear the selection

                return visibleText;  // Return the visible text from the entire document
            }

            // Function to extract lines after specific keywords
            function extractLinesAfterKeywords(text, keywords) {
                const lines = text.split('\n');  // Split the text into individual lines
                let results = [];
                let takeNextLine = false;
                let currentKeyword = null;

                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i].trim();

                    if (takeNextLine && currentKeyword) {
                        // Add the line after the detected keyword
                        results.push(line);
                        takeNextLine = false;
                        currentKeyword = null;
                    }

                    // Check if the current line matches any of the keywords
                    for (let keyword of keywords) {
                        if (line === keyword) {
                            // Check if the previous line starts with 'Close'
                            if (i > 0 && lines[i - 1].trim().startsWith('Close')) {
                                takeNextLine = false;  // Ignore extraction if the previous line contains 'Close'
                            } else {
                                takeNextLine = true;   // Set flag to take the next line
                                currentKeyword = keyword;
                            }
                            break;  // Stop checking other keywords if a match is found
                        }
                    }
                }

                return results.join('\n');  // Join the collected lines with newlines
            }

            // Function to copy text to the clipboard without alerts
            function copyToClipboard(text) {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';  // Prevent scrolling to bottom of page in MS Edge.
                textArea.style.top = '0';
                textArea.style.left = '0';
                textArea.style.width = '2em';
                textArea.style.height = '2em';
                textArea.style.padding = '0';
                textArea.style.border = 'none';
                textArea.style.outline = 'none';
                textArea.style.boxShadow = 'none';
                textArea.style.background = 'transparent';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    var successful = document.execCommand('copy');
                    // Removed alert notifications for successful or failed copy
                    if (!successful) {
                        console.error('Failed to copy to clipboard.');
                    }
                } catch (err) {
                    console.error('Unable to copy to clipboard', err);
                    // Removed alert for error copying
                }

                document.body.removeChild(textArea);
            }

            // Variables to track the previous state
            let previousText = getVisibleTextFromDocument();  // Initialize with the current visible text
            let wasOpenPreviously = false;  // Track whether "Open" was previously present
            let pncToggle = false;

            console.log(previousText);

            // Interval function to check for "Open" and show notification
            setInterval(() => {
                let currentText = getVisibleTextFromDocument();  // Get the current visible text
                console.log(currentText);
                // Check if the entire text contains 'Close...' or 'Alert Actions'
                if (currentText.includes("Close...") || currentText.includes("Alert Actions")) {
                    console.log("Detected 'Close...' or 'Alert Actions'. Skipping processing.");
                    return;  // Skip the rest of the processing
                }
                if (currentText.includes("Error:")) {
                    notify();
                    alert("An error has been found, you probably have to log in again.");
                    notify();
                }

                let containsOpen = currentText.includes("Open");

                if (currentText !== previousText) {
                    if (containsOpen && !wasOpenPreviously) {
                        notify();  // Alert if the text contains 'Open' after it was not present
                        let jobs = findRepeatJobs(currentText);
                        // Check if there's a PNC job
                        if (currentText.includes("PNC") && !pncToggle) {
                            pncToggle = true;
                            alert("Warning, one of these is PNC. Is it after a holiday? Mark as successful?");
                        } else {
                            pncToggle = false;
                        }
                        console.log(jobs);
                    }

                    // Update the state
                    wasOpenPreviously = containsOpen;
                    previousText = currentText;  // Update previousText to the new visible text
                }
            }, 8000);  // Check every 8 seconds

            // Assign the extraction and clipboard copying to the "Copy critical jobs" button
            copyJobsButton.addEventListener('click', function() {
                // Define the keywords to extract lines after
                const keywords = ["Open", "Acknowledged"];
                // Get the current visible text
                let currentText = getVisibleTextFromDocument();
                // Extract lines after 'Open' and 'Acknowledged'
                const extractedText = extractLinesAfterKeywords(currentText, keywords);

                if (extractedText && !extractedText.includes("Close...")) {  // Ignore extraction if it contains 'Close...'
                    copyToClipboard(extractedText);
                    console.log("Copied to clipboard:", extractedText);
                } else {
                    console.log("Extraction skipped because 'Close...' was found in the extracted text.");
                    alert("Extraction skipped because 'Close...' was found in the extracted text.");  // This alert remains as per your instructions
                }
            });

            // Assign the predefined text to be copied
            const predefinedText = `edw_ODSP_RMS_DATA_EDWP_box
        hr_SCHEDULE_box
        hr_COMMISSIONS_box
        hr_com_MV_SALEPLUSw
        edp_UK_ECOMM_box
        edw_infa_SISSALES_SLIP_W
        mk_BATCH_END_EMAIL
        edw_infa_SIG_DALLAS_SALES
        zms_BATCH_END_ZL
        mk_BATCH_END_EMAIL`;

            // Assign the clipboard copying to the "Copy predefined text" button
            copyPredefinedButton.addEventListener('click', function() {
                copyToClipboard(predefinedText);
                console.log("Copied predefined text to clipboard:", predefinedText);
            });
        })();

        notify(); // test the beep
        }
    });
})();