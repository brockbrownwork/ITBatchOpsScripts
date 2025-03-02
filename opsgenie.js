// ==UserScript==
// @name         OpsGenie Alert Generator
// @namespace    http://opsgenie.com/
// @version      2025-02-01
// @description  try to take over the world!
// @author       You
// @match        https://signetjewelers.app.opsgenie.com/alert/list
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        window.onurlchange
// ==/UserScript==

(function() {
    'use strict';
/**
 * Extracts lines containing dates in the format 'MMM DD, YYYY HH:MM:SS AM/PM',
 * ignores the first two dates found, calculates the average time difference
 * between subsequent entries, and returns the average time difference in hours as a float.
 *
 * @param {string} inputString - Input string containing multiple lines.
 * @returns {number} - Average time difference in hours, or 0.0 if not enough dates are found.
 */
function averageTimeDifference(inputString) {
    // Define the regular expression to match the date pattern at the beginning of the line
    const dateRegex = /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, \d{4} \d{1,2}:\d{2}:\d{2} (?:AM|PM)/;

    // Split the input string into lines
    const lines = inputString.split('\n');
    const dates = [];

    for (const line of lines) {
        // Match date at the beginning of the line
        const match = line.match(dateRegex);
        if (match) {
            const dateStr = match[0];
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate)) {
                dates.push(parsedDate);
            } else {
                console.warn(`Failed to parse date '${dateStr}'`);
            }
        }
    }

    // Debug: Print all parsed dates
    console.log("Parsed Dates:");
    dates.forEach(date => console.log(date));

    // Ignore the first two dates
    if (dates.length <= 2) {
        return 0.0;
    }
    const relevantDates = dates.slice(2);

    // Check if we have at least two remaining dates to calculate differences
    if (relevantDates.length < 2) {
        return 0.0;
    }

    // Calculate time differences in seconds
    const timeDifferences = [];
    for (let i = 1; i < relevantDates.length; i++) {
        const diffInMs = relevantDates[i] - relevantDates[i - 1];
        const diffInSeconds = diffInMs / 1000;
        timeDifferences.push(diffInSeconds);
    }

    // Debug: Print all time differences
    console.log("Time Differences (seconds):", timeDifferences);

    // Calculate the average time difference in hours
    const sumDifferences = timeDifferences.reduce((acc, val) => acc + val, 0);
    const avgTimeDiffHours = sumDifferences / timeDifferences.length / 3600;

    return Math.abs(avgTimeDiffHours);
}



// Example usage
const inputData = `
Event started on Sep 28, 2023 03:45:12 PM.
Another event occurred on Oct 01, 2023 10:15:30 AM.
Yet another event on Oct 05, 2023 08:20:45 PM.
Follow-up event on Oct 10, 2023 02:50:00 AM.
Final event on Oct 15, 2023 11:30:30 PM.
`;

const result = averageTimeDifference(inputData);
console.log(`Average time difference in hours: ${result.toFixed(2)}`);


async function extractReportData() {
    try {
        // Request permission to access the clipboard if not already granted
        if (!navigator.clipboard) {
            console.error('Clipboard API not supported in this browser.');
            return;
        }

        // Read text from the clipboard
        const clipboardText = await navigator.clipboard.readText();

        if (!clipboardText) {
            console.error('Clipboard is empty.');
            return;
        }
        // detect sleepers
        let timeDifference = Math.round(averageTimeDifference(clipboardText) * 100) / 100;
        if (timeDifference < 1.5) {
            if (!confirm(`Warning: this is a sleeper, ${timeDifference} hours between runs. Do you want to continue?`)) {
                return;
            }
        }

        // Split the text into lines
        const lines = clipboardText.split(/\r?\n/);

        // Initialize variables
        let name = '';
        let group = '';
        let command = '';
        let status = '';

        // Iterate through the lines to find the required information
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line === 'Name') {
                // Assuming the value is on the next line
                if (i + 1 < lines.length) {
                    name = lines[i + 1].trim();
                }
            } else if (line === 'Group') {
                if (i + 1 < lines.length) {
                    group = lines[i + 1].trim();
                    group = group.replace(/#/g, ' ');
                }
            } else if (line.startsWith('Command (cmd)') || line.startsWith("HTTP (http)")) {
                if (i + 1 < lines.length) {
                    const logEntry = lines[i + 1].trim();
                    // Split the log entry by tabs and remove any blank entries
                    const logParts = logEntry
                        .split('\t')
                        .filter(part => part.trim() !== '' && part.includes('(') && part.includes(')') && part.indexOf('(') === part.lastIndexOf('(') && part.indexOf(')') === part.lastIndexOf(')'));

                    // Check if the last item exists before assigning it to status
                    status = logParts[logParts.length - 1];
                }
            }
        }
        // account for the wrong group info in edp_SIGNET_AWS_IA_SRV_LVL
        if (name === "edp_SIGNET_AWS_IA_SRV_LVL" && group === "Digital Integration ETL") {
            alert("Note: this job is actually supposed to go to Business Intelligence. Automatically corrected. Please service queue in Jira.");
            group = "Business Int";
        }
        if (group === "Finance Dallas") {
            alert("This group wants to be called directly, see notes for Dallas Finance, go to Autosys playbook then click the '...' at the bottom, then go to Finance call tab.");
            return;
        }

        // Log the extracted information
        console.log('Name:', name);
        console.log('Group:', group);
        console.log('Status:', status);

        return [name, group, status];

    } catch (err) {
        console.error('Error reading clipboard:', err);
    }
}

// Function to add the "Create alert from report" button
function addCreateAlertFromReportButton() {
    // Helper function to find the existing "Create alert" button
    function findExistingButton() {
        // Adjust the selector based on your actual button's attributes
        const buttons = document.querySelectorAll('button');
        for (let btn of buttons) {
            if (btn.textContent.trim() === 'Create alert') {
                return btn;
            }
        }
        return null;
    }

    const existingButton = findExistingButton();

    if (!existingButton) {
        console.error('Existing "Create alert" button not found.');
        return;
    }

    // Create the new button
    const newButton = document.createElement('button');
    newButton.textContent = 'Create alert from report';
    newButton.style.marginLeft = '10px'; // Add some spacing

    // Insert the new button after the existing one
    existingButton.parentNode.insertBefore(newButton, existingButton.nextSibling);

    // Add click event listener to the new button
    newButton.addEventListener('click', fillOpsGenieAlert);
}

function changeResponders(someText) {
    // Locate the first input element of type "text" with placeholder "Search.."
    var inputElement = document.querySelector('input[type="text"][placeholder="Search.."]');
    if (!inputElement) {
        console.error('Input element not found');
        return;
    }

    // Focus on the input element
    inputElement.focus();

    var text = someText;
    var currentValue = '';

    // Function to simulate typing each character
    function typeCharacter(index) {
        if (index < text.length) {
            var char = text[index];
            currentValue += char;

            // Update the input's value
            inputElement.value = currentValue;

            // Create and dispatch an input event
            var inputEvent = new Event('input', { bubbles: true });
            inputElement.dispatchEvent(inputEvent);

            // Optionally, create and dispatch key events if necessary
            var keyCode = char.charCodeAt(0);

            var keyDownEvent = new KeyboardEvent('keydown', {
                key: char,
                code: 'Key' + char.toUpperCase(),
                keyCode: keyCode,
                which: keyCode,
                bubbles: true,
                cancelable: true
            });
            inputElement.dispatchEvent(keyDownEvent);

            var keyPressEvent = new KeyboardEvent('keypress', {
                key: char,
                code: 'Key' + char.toUpperCase(),
                keyCode: keyCode,
                which: keyCode,
                bubbles: true,
                cancelable: true
            });
            inputElement.dispatchEvent(keyPressEvent);

            var keyUpEvent = new KeyboardEvent('keyup', {
                key: char,
                code: 'Key' + char.toUpperCase(),
                keyCode: keyCode,
                which: keyCode,
                bubbles: true,
                cancelable: true
            });
            inputElement.dispatchEvent(keyUpEvent);

            // Continue typing the next character after a shorter delay
            setTimeout(function() {
                typeCharacter(index + 1);
            }, 50); // Reduced from 100 ms to 50 ms
        } else {
            // After typing all characters, wait for 2 seconds before simulating pressing Enter
            setTimeout(simulateEnterKey, 2000); // 2000 milliseconds = 2 seconds (unchanged)
        }
    }

    // Function to simulate pressing the Enter key
    function simulateEnterKey() {
        var enterKeyCode = 13;

        var keyDownEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: enterKeyCode,
            which: enterKeyCode,
            bubbles: true,
            cancelable: true
        });
        inputElement.dispatchEvent(keyDownEvent);

        var keyPressEvent = new KeyboardEvent('keypress', {
            key: 'Enter',
            code: 'Enter',
            keyCode: enterKeyCode,
            which: enterKeyCode,
            bubbles: true,
            cancelable: true
        });
        inputElement.dispatchEvent(keyPressEvent);

        var keyUpEvent = new KeyboardEvent('keyup', {
            key: 'Enter',
            code: 'Enter',
            keyCode: enterKeyCode,
            which: enterKeyCode,
            bubbles: true,
            cancelable: true
        });
        inputElement.dispatchEvent(keyUpEvent);
    }

    // Start typing the text
    typeCharacter(0);
}

function changeAPIIntegration() {
    // Locate the input element within the specified modal dialog
    var inputElement = document.querySelector('div.modal-dialog.modal-lg input.chosen-search-input[type="text"]');
    if (!inputElement) {
        console.error('Input element not found');
        return;
    }

    // Focus on the input element
    inputElement.focus();

    // The text to type
    var text = 'Alert';
    var currentValue = '';

    // Function to simulate typing each character
    function typeCharacter(index) {
        if (index < text.length) {
            var char = text[index];
            currentValue += char;

            // Update the input's value
            inputElement.value = currentValue;

            // Create and dispatch an input event
            var inputEvent = new Event('input', { bubbles: true });
            inputElement.dispatchEvent(inputEvent);

            // Optionally, create and dispatch key events if necessary
            var keyCode = char.charCodeAt(0);

            var keyDownEvent = new KeyboardEvent('keydown', {
                key: char,
                code: 'Key' + char.toUpperCase(),
                keyCode: keyCode,
                which: keyCode,
                bubbles: true,
                cancelable: true
            });
            inputElement.dispatchEvent(keyDownEvent);

            var keyPressEvent = new KeyboardEvent('keypress', {
                key: char,
                code: 'Key' + char.toUpperCase(),
                keyCode: keyCode,
                which: keyCode,
                bubbles: true,
                cancelable: true
            });
            inputElement.dispatchEvent(keyPressEvent);

            var keyUpEvent = new KeyboardEvent('keyup', {
                key: char,
                code: 'Key' + char.toUpperCase(),
                keyCode: keyCode,
                which: keyCode,
                bubbles: true,
                cancelable: true
            });
            inputElement.dispatchEvent(keyUpEvent);

            // Continue typing the next character after a shorter delay
            setTimeout(function() {
                typeCharacter(index + 1);
            }, 50); // Reduced from 100 ms to 50 ms
        } else {
            // After typing all characters, simulate pressing Enter
            simulateEnterKey();
        }
    }

    // Function to simulate pressing the Enter key
    function simulateEnterKey() {
        var enterKeyCode = 13;

        var keyDownEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: enterKeyCode,
            which: enterKeyCode,
            bubbles: true,
            cancelable: true
        });
        inputElement.dispatchEvent(keyDownEvent);

        var keyPressEvent = new KeyboardEvent('keypress', {
            key: 'Enter',
            code: 'Enter',
            keyCode: enterKeyCode,
            which: enterKeyCode,
            bubbles: true,
            cancelable: true
        });
        inputElement.dispatchEvent(keyPressEvent);

        var keyUpEvent = new KeyboardEvent('keyup', {
            key: 'Enter',
            code: 'Enter',
            keyCode: enterKeyCode,
            which: enterKeyCode,
            bubbles: true,
            cancelable: true
        });
        inputElement.dispatchEvent(keyUpEvent);
    }

    // Start typing the text
    typeCharacter(0);
}

function simulateTyping(element, text, delayBetweenKeystrokes = 10) {
    return new Promise((resolve) => {
        let index = 0;
        let currentValue = '';

        function typeCharacter() {
            if (index < text.length) {
                const char = text[index];
                currentValue += char;
                element.value = currentValue;

                // Dispatch input event
                const inputEvent = new Event('input', { bubbles: true });
                element.dispatchEvent(inputEvent);

                // Optionally dispatch key events if needed
                const keyCode = char.charCodeAt(0);

                const keyDownEvent = new KeyboardEvent('keydown', {
                    key: char,
                    code: 'Key' + char.toUpperCase(),
                    keyCode: keyCode,
                    which: keyCode,
                    bubbles: true,
                    cancelable: true
                });
                element.dispatchEvent(keyDownEvent);

                const keyPressEvent = new KeyboardEvent('keypress', {
                    key: char,
                    code: 'Key' + char.toUpperCase(),
                    keyCode: keyCode,
                    which: keyCode,
                    bubbles: true,
                    cancelable: true
                });
                element.dispatchEvent(keyPressEvent);

                const keyUpEvent = new KeyboardEvent('keyup', {
                    key: char,
                    code: 'Key' + char.toUpperCase(),
                    keyCode: keyCode,
                    which: keyCode,
                    bubbles: true,
                    cancelable: true
                });
                element.dispatchEvent(keyUpEvent);

                index++;
                setTimeout(typeCharacter, delayBetweenKeystrokes);
            } else {
                resolve();
            }
        }

        // Start typing
        typeCharacter();
    });
}

async function fillOpsGenieAlert() {
    console.log("fillOpsGenieAlert called...");

    let [jobName, group, status] = await extractReportData();
    if (jobName === "Reflexis_LSBS_TO_RDS") {
        group = "Web and Mobile Solutions";
    } else if (jobName.startsWith("Reflexis")) {
        group = "Workday-HCM-Payroll-WFM-Support";
    }
    if (jobName.startsWith("pse")) {
        group = "On Call - Distribution Escalation Policy";
    }
    if (jobName === "edw_DSS_AM_PROCESS") {
        status = "MUST_START_ALARM";
    }
    if (jobName === "ims_dc_WF_AD_PICK_LIST") {
        group = "On Call - Distribution Escalation Policy";
    }
    if (jobName.toUpperCase().includes("VERTEX")) {
        alert("Job name contains VERTEX, changing group to SAP Tax");
        group = "SAP Tax";
    }
    if (jobName.startsWith("car_") || jobName.startsWith("fin_rtr") || jobName.startsWith("ZFI_")) {
        alert("Make sure to put this alert in the BatchOps SAP Dev/Integration Chat as well");
    }

    let groupToOnCall = {
        "DCOE Support": "On call - business intelligence primary",
        "Digital Integration ETL": "on call - digital etl",
        "Enterprise Service Integration": "on call - esi",
        "SAP S4": "on call - sap s4_schedule"
    };
    group = groupToOnCall[group] ?? group;

    if (status === "Running (RUNNING)") {
        status = "MAXRUNALARM";
    } else if (status === "Failure (FAILURE)") {
        status = "JOBFAILURE";
    } else if (status === "Terminated (TERMINATED)") {
        status = "JOBTERMINATED";
    } else if (status === "Success (SUCCESS)") {
        const userChoice = confirm("Click OK for MAX RUN ALARM, Cancel for MUST START ALARM");
        status = userChoice ? "MAXRUNALARM" : "MUST_START_ALARM";
    } else if (status === "") {
        const userChoice = confirm("Click OK for MAX RUN ALARM, Cancel for MUST START ALARM");
        status = userChoice ? "MAXRUNALARM" : "MUST_START_ALARM";
    } else if (status === "Activated (ACTIVATED)") {
        status = "MUST_START_ALARM";
    }

    let description = `${jobName}; ${status}; autosys`;

    if (jobName.toLowerCase().endsWith("box") && status == "MAXRUNALARM") {
        alert("Don't page out maxrunalarms on boxes, look at the jobs inside it and investigate.");
        return;
    }

    if (group == "database system - support" || group == "sysops" || jobName.startsWith("dba")) {
        alert("Don't page out for DBA or SysOps :)\nTell them to page them Monday if it's the weekend, else ask first shift to page out.\n(note: if there's a bunch of these failed, maybe check it out...)");
        return;
    }

    if (group == "on call - sap s4_schedule") {
        copyTextToClipboard(description + "\nPlease advise.");
        alert("This is a SAP S4 alert, this needs to be posted on the BatchOps chat. Copied description to clipboard.");
        return;
    }

    if (status.includes("machine")) {
        alert("If this is a machine pending:\nping it, then go to enterprise command line to see if it's available in autosys\ntry to launch the autosys agent yourself in the enterprise command line, if that doesn't work try the start script. If that doesn't work, page IT platform operations.");
    }

    // Find and click the first button with the text "Create alert"
    const buttons = document.querySelectorAll('button');
    for (let button of buttons) {
        if (button.textContent.trim() === "Create alert") {
            button.click();
            break;
        }
    }

    // Wait 500 milliseconds before clicking the first element with the class "ops-slider"
    await new Promise(resolve => setTimeout(resolve, 500)); // Reduced from 1000 ms to 500 ms

    const sliderElement = document.querySelector('.ops-slider');
    if (sliderElement) {
        sliderElement.click();
    }

    // Wait an additional 500 milliseconds before setting the textarea values
    await new Promise(resolve => setTimeout(resolve, 500)); // Reduced from 1000 ms to 500 ms

    // Find the first modal dialog with class "modal-dialog modal-lg"
    const modal = document.querySelector('.modal-dialog.modal-lg');
    if (modal) {
        // Find the first textarea within the modal with name="message"
        const textarea = modal.querySelector('textarea[name="message"]');
        // Find the first textarea within the modal with name="description"
        const descriptionTextarea = modal.querySelector('textarea[name="description"]');

        if (textarea && descriptionTextarea) {
            // Simulate typing into the first textarea with a reduced delay
            await simulateTyping(textarea, description, 10);

            // Wait a small delay before typing into the next field
            await new Promise(resolve => setTimeout(resolve, 250)); // Reduced from 500 ms to 250 ms

            // Simulate typing into the second textarea with a reduced delay
            await simulateTyping(descriptionTextarea, description, 10); // Reduced from 100 ms to 50 ms per keystroke

            // After typing into both fields, wait a small delay
            await new Promise(resolve => setTimeout(resolve, 500)); // Reduced from 1000 ms to 500 ms

            // Call changeResponders and changeAPIIntegration
            changeResponders(group);
            changeAPIIntegration();
        } else {
            console.error('Textarea elements not found');
        }
    } else {
        console.error('Modal dialog not found');
    }
}

function copyTextToClipboard(text) {
    var textArea = document.createElement("textarea");

    //
    // *** This styling is an extra step which is likely not required. ***
    //
    // Why is it here? To ensure:
    // 1. the element is able to have focus and selection.
    // 2. if the element was to flash render it has minimal visual impact.
    // 3. less flakyness with selection and copying which **might** occur if
    //    the textarea element is not visible.
    //
    // The likelihood is the element won't even render, not even a
    // flash, so some of these are just precautions. However in
    // Internet Explorer the element is visible whilst the popup
    // box asking the user for permission for the web page to
    // copy to the clipboard.
    //

    // Place in the top-left corner of screen regardless of scroll position.
    textArea.style.position = 'fixed';
    textArea.style.top = 0;
    textArea.style.left = 0;

    // Ensure it has a small width and height. Setting to 1px / 1em
    // doesn't work as this gives a negative w/h on some browsers.
    textArea.style.width = '2em';
    textArea.style.height = '2em';

    // We don't need padding, reducing the size if it does flash render.
    textArea.style.padding = 0;

    // Clean up any borders.
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';

    // Avoid flash of the white box if rendered for any reason.
    textArea.style.background = 'transparent';


    textArea.value = text;

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      var successful = document.execCommand('copy');
      var msg = successful ? 'successful' : 'unsuccessful';
      console.log('Copying text command was ' + msg);
    } catch (err) {
      console.log('Oops, unable to copy');
    }

    document.body.removeChild(textArea);
  }

const wait10Seconds = () => {
    return new Promise(resolve => {
        setTimeout(resolve, 10000);
    });
};

// Wait ten seconds for browser elements to fully load then start the script.
wait10Seconds().then(() => {
    console.log("Waited 10 seconds...");
    addCreateAlertFromReportButton();
});





})();