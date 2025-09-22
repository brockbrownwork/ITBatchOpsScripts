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

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: message
        });

        if (response.ok) {
            console.log('Message sent successfully!');
            // Clear the input field after successful send
        } else {
            const errorText = await response.text();
            console.error('Failed to send message:', response.status, errorText);
        }
    } catch (error) {
        // The catch block is now an important safety net for network errors,
        // such as if the server is down.
        console.error('Network error:', error);
    }
}

function printTableHeaders() {
    // 1. Get all <th> elements on the page.
    const headerElements = document.querySelectorAll('th');

    // 2. Create an empty array to store the text content.
    let headerTexts = [];
    
    // 3. Loop through the NodeList of elements and push the text content to the array.
    headerElements.forEach(header => {
        headerTexts.push(header.textContent.trim());
    });

    headerTexts = headerTexts.slice(0, -1);
    // 4. Also log the result to the browser's console for debugging.
    console.log("Table Headers:", headerTexts);
    return headerTexts;
}

function processTableRows() {
  const tableHeaders = printTableHeaders(); // Assumed to be a function that returns an array of strings
  let csvContent = "";

  // Use a CSS selector to find the first element with all three classes.
  // The syntax '.class1.class2.class3' targets an element that has all of the classes specified.
  const targetElement = document.querySelector('.ULPanel.RWHorizontal.OverviewPage');

  // Check if an element was found.
  if (targetElement) {
    // Add headers to the CSV content.
    csvContent += tableHeaders.join(',') + '\n';

    // Find all <tr> elements within the target element.
    const rows = targetElement.querySelectorAll('tr');

    // Check if any rows were found.
    if (rows.length > 0) {
      // Iterate over each <tr> (table row) element.
      rows.forEach((row, rowIndex) => {
        // If the current row is less than 3, don't process it.
        if (rowIndex + 1 >= 3) {
          // Find all <td> (table data) elements within the current row.
          const cells = row.querySelectorAll('td');
          const rowData = [];

          // Iterate over each <td> element in the current row.
          cells.forEach((cell) => {
            // Get the text content of the <td> and trim any whitespace.
            let cellText = cell.textContent.trim();
            // Wrap the text in quotes to handle commas within the data.
            if (cellText == "ErrorView Log") {
              cellText = "Error";
            }
            rowData.push(`"${cellText}"`);
          });

          // Join the cell data with commas and add a newline.
          csvContent += rowData.join(',') + '\n';
        }
      });
      console.log(csvContent);
      sendMessage(csvContent);
      return csvContent;
    } else {
      console.log('No <tr> elements found inside the target element.');
      return null;
    }
  } else {
    // If no element with the specified classes is found, log a message.
    console.log('No element found with the classes: ULPanel, RWHorizontal, OverviewPage');
    return null;
  }
}