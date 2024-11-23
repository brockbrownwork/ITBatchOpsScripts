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

    if (group === "DCOE Support") {
        group = "Business Int";
    } else if (group === "Enterprise Service Integration") {
        group = "Enterprise Services Integration";
    }

    if (status === "Running (RUNNING)") {
        status = "MAXRUNALARM";
    } else if (status === "Failure (FAILURE)") {
        // TODO: put the other thing in here...
        status = "JOBFAILURE";
    }

 // TODO: fill this for the rest of the names...

    let description = `${jobName}; ${status}; autosys`;

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

addCreateAlertFromReportButton();
