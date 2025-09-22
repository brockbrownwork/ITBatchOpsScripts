function scrollTableUntilLoaded() {
  /**
   * This function finds the first element with the class "TableInt"
   * and scrolls it down repeatedly until a span element with the text
   * "Showing X of X results" is found, indicating all results are loaded.
   */
  const table = document.querySelector('.TableInt');

  if (table) {
    let scrollCount = 0;
    const maxScrolls = 50; // Safeguard to prevent an infinite loop
    const scrollAmount = 2000; // Scrolls down by 2000 pixels
    const scrollInterval = 1000; // 1 second between scrolls

    /**
     * Checks the page for a span indicating all results are shown (e.g., "Showing 294 of 294 results").
     * @returns {boolean} - True if the completion span is found, otherwise false.
     */
    const areAllResultsLoaded = () => {
      // This regular expression looks for the pattern "Showing [number] of [same number] results".
      // The `(\d+)` captures a group of digits, and `\1` ensures the second number matches the first.
      const regex = /^Showing (\d+) of \1 results$/;
      const spans = document.querySelectorAll('span');

      for (const span of spans) {
        // Check if any span's text content matches the required pattern
        if (regex.test(span.textContent.trim())) {
          console.log(`✅ Found completion text: "${span.textContent.trim()}"`);
          return true;
        }
      }
      return false;
    };

    const intervalId = setInterval(() => {
      // First, check if all results have been loaded.
      if (areAllResultsLoaded()) {
        clearInterval(intervalId);
        console.log("All results are loaded. Scrolling has stopped.");
        return; // Exit the function
      }

      // Next, check if we've hit the scroll limit to prevent an infinite loop.
      if (scrollCount >= maxScrolls) {
        clearInterval(intervalId);
        console.error(`Stopped scrolling after ${maxScrolls} attempts. The completion text was not found.`);
        return; // Exit the function
      }
      
      // If neither of the above conditions is met, scroll down.
      table.scrollBy({
        top: scrollAmount,
        left: 0,
        behavior: 'smooth'
      });

      scrollCount++;
      console.log(`Scrolled... Attempt ${scrollCount}/${maxScrolls}`);

    }, scrollInterval);

  } else {
    console.error("Could not find an element with class 'TableInt' to scroll.");
  }
}

function clickRefreshButton(){
    // IMPORTANT NOTE: This will only work if you have ONE RMJ tab open
    // This script finds the first button that has both the classes 'ULButton' and 'RWItem'
    // and also contains a specific span child. It then programmatically simulates a click on it.

    // Use querySelector with the :has() pseudo-class to find the target button.
    // The selector first finds elements with '.ULButton.RWItem' and then checks
    // if they contain a span with the classes 'ULButton-Icon' and 'IMAGE_RWGENERAL_REFRESH'.
    const targetButton = document.querySelector('.ULButton.RWItem:has(span.ULButton-Icon.IMAGE_RWGENERAL_REFRESH)');

    // Check if an element was found to prevent errors.
    if (targetButton) {
    // Simulate a click on the found button.
    targetButton.click();
    console.log('Successfully clicked the button with classes ULButton and RWItem that contains the specified span.');
    } else {
    console.log('No button with the classes ULButton and RWItem and the specified span child was found on the page.');
    }
}

function populateJobs(){
  clickRefreshButton();
  scrollTableUntilLoaded();
}

async function sendMessage(message) {
    const url = 'http://127.0.0.1:5000/message';

    statusMessage.textContent = 'Sending...';
    statusMessage.className = 'mt-4 text-center text-sm text-gray-500';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: message
        });

        if (response.ok) {
            statusMessage.textContent = 'Message sent successfully!';
            statusMessage.className = 'mt-4 text-center text-sm text-green-600 font-semibold';
            console.log('Message sent successfully!');
            // Clear the input field after successful send
            messageInput.value = '';
        } else {
            const errorText = await response.text();
            statusMessage.textContent = `Failed to send message: ${errorText}`;
            statusMessage.className = 'mt-4 text-center text-sm text-red-600 font-semibold';
            console.error('Failed to send message:', response.status, errorText);
        }
    } catch (error) {
        // The catch block is now an important safety net for network errors,
        // such as if the server is down.
        statusMessage.textContent = 'Error: Could not connect to the server. Please ensure the Python server is running.';
        statusMessage.className = 'mt-4 text-center text-sm text-red-600 font-semibold';
        console.error('Network error:', error);
    }
}