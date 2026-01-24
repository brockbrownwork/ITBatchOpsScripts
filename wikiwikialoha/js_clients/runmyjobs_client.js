
// ==UserScript==
// @name         Wikiwiki Aloha - RunMyJobs Client
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Communicates with the Wikiwiki Aloha server from the RunMyJobs page.
// @author       Gemini
// @match        https://*.runmyjobs.com/*
// @require      https://cdn.socket.io/4.7.5/socket.io.min.js
// @grant        GM_log
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const SERVER_URL = "http://localhost:5001";
    const CLIENT_TYPE = "runmyjobs";

    // --- Logging ---
    // Use GM_log for logging in the browser console (provided by Tampermonkey/Greasemonkey)
    function log(message) {
        GM_log(`[${CLIENT_TYPE}] ${message}`);
    }

    log("Client script starting...");

    // --- Socket.IO Client Setup ---
    const sio = io(SERVER_URL, {
        reconnectionDelay: 5000,
        reconnectionAttempts: 10,
        transports: ['websocket'] // Force websockets
    });

    let clientName = null; // Will be set by the server upon registration

    sio.on('connect', () => {
        log(`Connected to server. Sending identification as '${CLIENT_TYPE}'.`);
        sio.emit('identify', { client_type: CLIENT_TYPE });
    });

    sio.on('connect_error', (err) => {
        log(`Connection failed: ${err.message}`);
    });

    sio.on('disconnect', () => {
        log("Disconnected from server. Will attempt to reconnect.");
    });

    sio.on('registered', (data) => {
        clientName = data.client_name;
        log(`Successfully registered with server as '${clientName}'.`);
    });

    sio.on('message', (data) => {
        log(`Received message from server: ${JSON.stringify(data)}`);
    });

    // --- Command Handlers ---

    // Handles 'fire-and-forget' commands
    sio.on('command', (data) => {
        const { action, payload } = data;
        log(`Received command: '${action}' with payload: ${JSON.stringify(payload)}`);

        // --- Action Handler ---
        if (action === "run_job") {
            // Placeholder: In a real script, you would interact with the DOM to run a job
            console.log(`ACTION: Pretending to run job with details:`, payload);
            alert(`ACTION: Running job: ${payload.job_name || 'unspecified'}`);
            sendUpdate("Finished running job.");
        } else {
            log(`Unknown action received: ${action}`);
        }
    });

    // Handles commands that require a direct response
    sio.on('command_with_response', (data, callback) => {
        const { action, payload } = data;
        log(`Received command with response request: '${action}' with payload: ${JSON.stringify(payload)}`);

        // --- Action and Response Logic ---
        if (action === "get_status") {
            log("ACTION: Getting status...");
            // Placeholder: Check the DOM for current job statuses
            const response = { status: 'idle', running_jobs: 0, page_url: window.location.href };
            log(`Sending response: ${JSON.stringify(response)}`);
            callback(response);
        } else {
            const errorResponse = { status: 'error', message: `Unknown action: ${action}` };
            log(`Sending error response: ${JSON.stringify(errorResponse)}`);
            callback(errorResponse);
        }
    });

    // --- Client-to-Server Communication ---
    function sendUpdate(message, payload = {}) {
        if (!clientName) {
            log("Cannot send update: client is not yet registered.");
            return;
        }

        log(`Sending update to server: ${message}`);
        sio.emit('message_from_client', {
            source: clientName,
            payload: {
                message: message,
                data: payload
            }
        });
    }

    // Example: Add a button to the page to send a message manually
    const testButton = document.createElement('button');
    testButton.textContent = 'Send Test Update to Server';
    testButton.style.position = 'fixed';
    testButton.style.top = '10px';
    testButton.style.right = '10px';
    testButton.style.zIndex = '9999';
    testButton.onclick = () => {
        sendUpdate("Manual test button clicked.", { url: window.location.href });
    };
    document.body.appendChild(testButton);

    log("Client script initialized.");

})();
