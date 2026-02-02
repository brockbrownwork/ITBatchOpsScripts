/**
 * Nagios Watcher - Standalone Version
 *
 * Monitors two host status elements on the Nagios page and announces via TTS
 * when either value increases from its previous state.
 *
 * Usage:
 *   - Paste this script into the browser console on the Nagios page
 *   - Or include it as a <script> tag
 *
 * Commands:
 *   NagiosWatcher.start(30)     - Start watching (check every 30 seconds)
 *   NagiosWatcher.stop()        - Stop watching
 *   NagiosWatcher.checkNow()    - Run a single check now
 *   NagiosWatcher.reset()       - Clear last seen values
 *   NagiosWatcher.status()      - Show current values
 */

(function() {
    'use strict';

    const NagiosWatcher = {
        version: "1.0",
        lastValues: {
            element1: null,
            element2: null
        },
        isRunning: false,
        checkInterval: null,

        // Get the two elements we're watching
        getElements() {
            const el1 = document.querySelectorAll('[id^="host_status_summary_"]')[1].querySelector('table > tbody:nth-child(2) > tr > td:nth-child(3) > div > a');
            const el2 = document.querySelectorAll('[id^="host_status_summary_"]')[1].querySelector('table > tbody:nth-child(2) > tr > td:nth-child(4) > div > a');

            return { el1, el2 };
        },

        // Parse the inner text as a number
        parseValue(element) {
            if (!element) return null;
            const text = element.innerText.trim();
            const num = parseInt(text, 10);
            return isNaN(num) ? null : num;
        },

        // Speak text using Web Speech API
        speak(text) {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                window.speechSynthesis.speak(utterance);
                console.log(`[NagiosWatcher] [TTS] ${text}`);
            } else {
                console.warn("[NagiosWatcher] WARN: Speech synthesis not supported in this browser.");
            }
        },

        // Main check function
        performCheck() {
            const { el1, el2 } = this.getElements();

            const val1 = this.parseValue(el1);
            const val2 = this.parseValue(el2);

            const timestamp = new Date().toLocaleTimeString();
            console.log(`[NagiosWatcher] [${timestamp}] Current values: Element1=${val1}, Element2=${val2}`);

            let shouldAlert = false;

            // Check if element 1 increased
            if (val1 !== null && this.lastValues.element1 !== null) {
                if (val1 > this.lastValues.element1) {
                    console.warn(`[NagiosWatcher] Element 1 increased: ${this.lastValues.element1} -> ${val1}`);
                    shouldAlert = true;
                }
            }

            // Check if element 2 increased
            if (val2 !== null && this.lastValues.element2 !== null) {
                if (val2 > this.lastValues.element2) {
                    console.warn(`[NagiosWatcher] Element 2 increased: ${this.lastValues.element2} -> ${val2}`);
                    shouldAlert = true;
                }
            }

            // Alert if either value increased
            if (shouldAlert) {
                this.speak("Attention: Check Nagios");
            } else {
                console.log("[NagiosWatcher] No increase detected");
            }

            // Update last seen values
            if (val1 !== null) this.lastValues.element1 = val1;
            if (val2 !== null) this.lastValues.element2 = val2;

            return { val1, val2, alerted: shouldAlert };
        },

        // Initialize - capture current state without announcing
        initialize() {
            const { el1, el2 } = this.getElements();

            this.lastValues.element1 = this.parseValue(el1);
            this.lastValues.element2 = this.parseValue(el2);

            console.log(`[NagiosWatcher] Initialized with values: Element1=${this.lastValues.element1}, Element2=${this.lastValues.element2}`);
        },

        // Start periodic checking
        start(intervalSeconds = 30) {
            if (this.isRunning) {
                console.log("[NagiosWatcher] Already running.");
                return;
            }

            this.initialize();
            this.isRunning = true;

            this.checkInterval = setInterval(() => {
                this.performCheck();
            }, intervalSeconds * 1000);

            console.log(`[NagiosWatcher] Started watching. Checking every ${intervalSeconds} seconds.`);
        },

        // Stop periodic checking
        stop() {
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
            }
            this.isRunning = false;
            console.log("[NagiosWatcher] Stopped watching.");
        },

        // Reset last seen values
        reset() {
            this.lastValues.element1 = null;
            this.lastValues.element2 = null;
            console.log("[NagiosWatcher] Reset last seen values.");
        },

        // Run a single check manually
        checkNow() {
            return this.performCheck();
        },

        // Show current status
        status() {
            const { el1, el2 } = this.getElements();
            const val1 = this.parseValue(el1);
            const val2 = this.parseValue(el2);

            console.log("[NagiosWatcher] Status:");
            console.log(`  Running: ${this.isRunning}`);
            console.log(`  Last values: Element1=${this.lastValues.element1}, Element2=${this.lastValues.element2}`);
            console.log(`  Current values: Element1=${val1}, Element2=${val2}`);

            return {
                running: this.isRunning,
                lastValues: { ...this.lastValues },
                currentValues: { element1: val1, element2: val2 }
            };
        }
    };

    // Expose to global scope
    window.NagiosWatcher = NagiosWatcher;

    console.log(`[NagiosWatcher] === Nagios Watcher v${NagiosWatcher.version} Loaded ===`);
    console.log("[NagiosWatcher] Commands:");
    console.log("[NagiosWatcher]   NagiosWatcher.start(30)     - Start watching (check every 30 seconds)");
    console.log("[NagiosWatcher]   NagiosWatcher.stop()        - Stop watching");
    console.log("[NagiosWatcher]   NagiosWatcher.checkNow()    - Run a single check now");
    console.log("[NagiosWatcher]   NagiosWatcher.reset()       - Clear last seen values");
    console.log("[NagiosWatcher]   NagiosWatcher.status()      - Show current values");

    // Auto-start watching on load
    console.log("[NagiosWatcher] Auto-starting in 2 seconds...");
    setTimeout(() => {
        NagiosWatcher.start(30);
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance("Nagios Watcher started");
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    }, 2000);
})();
