# Wikiwiki Aloha 2000 Automation System

## Project Overview

This project, "Wikiwiki Aloha 2000," is a client-server automation system designed to streamline IT operations tasks. It consists of a central Python server that acts as a state machine and a message broker, communicating with various clients to perform actions.

The architecture is based on real-time, bidirectional communication using WebSockets (`Flask-SocketIO` on the server, `python-socketio` and `socket.io-client` for the clients). The server manages client connections, assigns unique names, and routes commands.

**Core Technologies:**
*   **Backend:** Python, Flask, Flask-SocketIO, Eventlet
*   **Clients:** Python scripts and JavaScript UserScripts (for browser extensions like Tampermonkey).

**Client Types:**
*   **Python:** `Outlook`, `Discord`, `TTS` (Text-to-Speech), `User` (CLI interaction).
*   **JavaScript:** `runmyjobs`, `Atlassian Alerts`, `Solarwinds`, `Nagios`.

The primary goal is to automate monitoring and response tasks, such as handling alerts, managing emails, and interacting with various web-based job systems.

## Building and Running

### 1. Installation

The project uses a Python virtual environment to manage dependencies. First, ensure you have Python 3 installed.

To install the required packages, run the following command from the project root:

```bash
pip install -r requirements.txt
```

### 2. Running the Server

The central server must be running for any clients to connect.

```bash
python server.py
```

The server will start and listen on `http://localhost:5001`. The logs will indicate that the `eventlet` server is being used.

### 3. Running the Clients

#### Python Clients
Each Python client must be run in its own separate terminal process.

```bash
# Example for the Outlook client
python python_clients/outlook_client.py

# Example for the Discord client
python python_clients/discord_client.py
```

#### JavaScript Clients (UserScripts)
The JavaScript clients are designed to be run in the browser using a userscript manager like **Tampermonkey** or **Greasemonkey**.

1.  Install the appropriate extension for your browser.
2.  Create a new script in the extension's dashboard.
3.  Copy the entire content of a client file (e.g., `js_clients/runmyjobs_client.js`) and paste it into the new script editor.
4.  Save the script. It will automatically execute when you navigate to a URL matching the `@match` pattern in the script's header (e.g., `https://*.runmyjobs.com/*`).

## Development Conventions

*   **Client-Server Communication:** All communication happens over WebSockets, orchestrated by the `server.py` file.
*   **Client Identification:** On connection, each client sends an `identify` event with its `client_type`. The server then assigns a unique name (e.g., `Outlook` or `Outlook 2` if a duplicate connects) and confirms registration with a `registered` event.
*   **Message Format:** Messages are sent as JSON objects.
    *   Server-to-client commands use the `command` or `command_with_response` events and typically have an `action` and `payload` field.
    *   Client-to-server messages use the `message_from_client` event and include a `source` (the client's unique name) and a `payload`.
*   **Asynchronous Server:** The Flask server uses `eventlet` to handle asynchronous operations and manage multiple WebSocket connections efficiently.
*   **Dependencies:** Python dependencies are managed in `requirements.txt`. JavaScript dependencies (like `socket.io-client`) are loaded via the `@require` directive in the userscript header, pointing to a CDN.
*   **Modularity:** Each client is a self-contained script responsible for a specific service. All business logic for interacting with that service (e.g., checking emails, running a job) should be contained within its respective client file.
