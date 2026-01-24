
// ==UserScript==
// @name         Wikiwiki Aloha - Atlassian Alerts Client
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Communicates with the Wikiwiki Aloha server from Atlassian pages (Jira, etc.).
// @author       Gemini
// @match        https://*.atlassian.net/*
// @require      https://cdn.socket.io/4.7.5/socket.io.min.js
// @grant        GM_log
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const SERVER_URL = "http://localhost:5001";
    const CLIENT_TYPE = "Atlassian Alerts";

    function log(message) {
        GM_log(`[${CLIENT_TYPE}] ${message}`);
    }

    log("Client script starting...");

    const sio = io(SERVER_URL, {
        reconnectionDelay: 5000,
        reconnectionAttempts: 10,
        transports: ['websocket']
    });

    let clientName = null;

    sio.on('connect', () => {
        log(`Connected to server. Sending identification as '${CLIENT_TYPE}'.`);
        sio.emit('identify', { client_type: CLIENT_TYPE });
    });

    sio.on('connect_error', (err) => { log(`Connection failed: ${err.message}`); });
    sio.on('disconnect', () => { log("Disconnected from server."); });

    sio.on('registered', (data) => {
        clientName = data.client_name;
        log(`Successfully registered with server as '${clientName}'.`);
    });

    sio.on('message', (data) => {
        log(`Received message from server: ${JSON.stringify(data)}`);
    });

    sio.on('command', (data) => {
        const { action, payload } = data;
        log(`Received command: '${action}' with payload: ${JSON.stringify(payload)}`);

        if (action === "create_ticket") {
            console.log(`ACTION: Pretending to create Jira ticket:`, payload);
            alert(`ACTION: Create Jira Ticket: ${payload.summary || 'No summary'}`);
            sendUpdate("Ticket creation process initiated.");
        } else {
            log(`Unknown action received: ${action}`);
        }
    });

    sio.on('command_with_response', (data, callback) => {
        const { action, payload } = data;
        log(`Received command with response request: '${action}'`);

        if (action === "get_status") {
            log("ACTION: Getting status...");
            const response = { status: 'viewing_page', user: document.querySelector('[data-testid="common-header-profile-menu-trigger-button"]')?.getAttribute('aria-label') || 'Unknown User' };
            callback(response);
        } else {
            callback({ status: 'error', message: `Unknown action: ${action}` });
        }
    });

    function sendUpdate(message, payload = {}) {
        if (!clientName) {
            log("Cannot send update: client is not yet registered.");
            return;
        }
        sio.emit('message_from_client', {
            source: clientName,
            payload: { message: message, data: payload }
        });
    }

    log("Client script initialized.");
})();
