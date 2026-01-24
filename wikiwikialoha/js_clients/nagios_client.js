
// ==UserScript==
// @name         Wikiwiki Aloha - Nagios Client
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Communicates with the Wikiwiki Aloha server from Nagios pages.
// @author       Gemini
// @match        https://*/nagios/*
// @require      https://cdn.socket.io/4.7.5/socket.io.min.js
// @grant        GM_log
// ==/UserScript==

(function() {
    'use strict';

    const SERVER_URL = "http://localhost:5001";
    const CLIENT_TYPE = "Nagios";

    function log(message) { GM_log(`[${CLIENT_TYPE}] ${message}`); }

    log("Client script starting...");

    const sio = io(SERVER_URL, {
        reconnectionDelay: 5000,
        reconnectionAttempts: 10,
        transports: ['websocket']
    });

    let clientName = null;

    sio.on('connect', () => {
        log(`Connected. Identifying as '${CLIENT_TYPE}'.`);
        sio.emit('identify', { client_type: CLIENT_TYPE });
    });

    sio.on('connect_error', (err) => { log(`Connection failed: ${err.message}`); });
    sio.on('disconnect', () => { log("Disconnected from server."); });

    sio.on('registered', (data) => {
        clientName = data.client_name;
        log(`Registered as '${clientName}'.`);
    });

    sio.on('message', (data) => {
        log(`Server message: ${JSON.stringify(data)}`);
    });

    sio.on('command', (data) => {
        const { action, payload } = data;
        log(`Command: '${action}', Payload: ${JSON.stringify(payload)}`);

        if (action === "silence_host") {
            console.log(`ACTION: Silencing host:`, payload);
            alert(`ACTION: Silencing host: ${payload.host_name || 'N/A'}`);
            sendUpdate("Host silenced.");
        } else {
            log(`Unknown action: ${action}`);
        }
    });

    sio.on('command_with_response', (data, callback) => {
        const { action, payload } = data;
        log(`Response request: '${action}'`);

        if (action === "get_status") {
            log("ACTION: Getting status...");
            // Placeholder: Scrape the DOM for critical alerts
            const response = { status: 'monitoring', critical_alerts: 2 };
            callback(response);
        } else {
            callback({ status: 'error', message: `Unknown action: ${action}` });
        }
    });

    function sendUpdate(message, payload = {}) {
        if (!clientName) return;
        sio.emit('message_from_client', {
            source: clientName,
            payload: { message: message, data: payload }
        });
    }

    log("Client script initialized.");
})();
