# IT BatchOps Scripts

## Project Overview

This project is a collection of personal automation scripts designed to streamline IT operations tasks. The scripts are written in Python and JavaScript (as user scripts for web browsers) and are tailored to specific internal workflows and tools, such as OpsGenie and other web-based job management systems.

The scripts automate tasks such as:

*   Preventing the computer from sleeping (`1_caffeine.py`).
*   Providing reminders for critical jobs with audible and visual alerts (`2_critical_job_reminders.py`).
*   Checking clipboard content for specific keywords (`check_maestro.py`).
*   Monitoring web pages for changes (`prompts.js`).
*   Automating the creation of OpsGenie alerts from reports (`jira_alert_creator.js`).
*   Copying job information from a web-based job runner (`runmyjobs.js`).

## Building and Running

### Python Scripts

The Python scripts require the dependencies listed in `requirements.txt`. To install them, run:

```bash
pip install -r requirements.txt
```

To run a specific Python script, use the Python interpreter:

```bash
python <script_name>.py
```

For example, to run the caffeine script:

```bash
python 1_caffeine.py
```

### JavaScript Scripts

The JavaScript files in this project are designed to be used as user scripts with a browser extension like Tampermonkey or Greasemonkey.

To use them:

1.  Install a user script manager extension in your web browser.
2.  Create a new user script.
3.  Copy and paste the content of the desired `.js` file into the new script.
4.  The script will automatically run on the websites specified in the `@match` directive in the script's header.

## Development Conventions

*   **Script Naming:** Scripts are numbered and named to indicate their purpose and execution order.
*   **Dependencies:** Python dependencies are managed in `requirements.txt`.
*   **User-Specific Logic:** The scripts contain hardcoded values and logic specific to the user's environment and workflows. When modifying scripts, be mindful of these specific details.
*   **Modularity:** The scripts are generally self-contained and designed to perform a specific task.
