/**
 * Solarwinds Alert Detector
 *
 * Polls two specific element counts on a Solarwinds dashboard and announces
 * via TTS when either value increases from its previous baseline.
 *
 * Includes flap detection: alerts only trigger after the elevated count persists
 * for a configurable number of consecutive checks (default: 5). This prevents
 * false alarms from transient spikes that resolve themselves.
 *
 * Usage:
 *   - Paste this script into the browser console on the Solarwinds page
 *   - Or include it as a <script> tag
 *
 * Commands:
 *   SolarwindsAlertDetector.start(60)     - Start watching (check every 60 seconds)
 *   SolarwindsAlertDetector.stop()        - Stop watching
 *   SolarwindsAlertDetector.checkNow()    - Run a single check now
 *   SolarwindsAlertDetector.reset()       - Clear last seen values and flap state
 *   SolarwindsAlertDetector.status()      - Show current values and flap state
 *   SolarwindsAlertDetector.setFlapThreshold(n) - Set consecutive checks required (default: 5)
 */

(function() {
    'use strict';

    const SELECTORS = {
        element1: "#ctl00_ctl00_ctl00_BodyContent_ContentPlaceHolder1_MainContentPlaceHolder_ResourceHostControl1_resContainer_rptContainers_ctl00_rptColumn4_ctl00_ctl01_wrapper_headerBar > h1 > span",
        element2: "#ctl00_ctl00_ctl00_BodyContent_ContentPlaceHolder1_MainContentPlaceHolder_ResourceHostControl1_resContainer_rptContainers_ctl00_rptColumn4_ctl01_ctl01_wrapper_headerBar > h1 > span"
    };

    const SolarwindsAlertDetector = {
        version: "1.0",
        lastValues: {
            element1: null,
            element2: null
        },
        flapState: {
            element1: { elevatedCount: 0, pendingValue: null },
            element2: { elevatedCount: 0, pendingValue: null }
        },
        flapThreshold: 5,
        isRunning: false,
        checkInterval: null,

        // Parse the count from a span element whose text is like "(3)"
        parseValue(selector) {
            const el = document.querySelector(selector);
            if (!el) return null;
            const text = el.innerText.slice(1, -1).trim();
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
                console.log(`[SolarwindsAlertDetector] [TTS] ${text}`);
            } else {
                console.warn("[SolarwindsAlertDetector] WARN: Speech synthesis not supported in this browser.");
            }
        },

        // Check a single element for increase with flap detection
        checkElementWithFlap(elementName, currentValue, lastValue, flapState) {
            if (currentValue === null || lastValue === null) {
                return { shouldAlert: false, message: null };
            }

            const isElevated = currentValue > lastValue;

            if (isElevated) {
                if (flapState.pendingValue === null || currentValue !== flapState.pendingValue) {
                    flapState.pendingValue = currentValue;
                    flapState.elevatedCount = 1;
                    console.log(`[SolarwindsAlertDetector] ${elementName} elevated: ${lastValue} -> ${currentValue} (check 1/${this.flapThreshold})`);
                } else {
                    flapState.elevatedCount++;
                    console.log(`[SolarwindsAlertDetector] ${elementName} still elevated at ${currentValue} (check ${flapState.elevatedCount}/${this.flapThreshold})`);
                }

                if (flapState.elevatedCount >= this.flapThreshold) {
                    console.warn(`[SolarwindsAlertDetector] ${elementName} confirmed increase: ${lastValue} -> ${currentValue} (persisted ${flapState.elevatedCount} checks)`);
                    return { shouldAlert: true, confirmedValue: currentValue };
                }

                return { shouldAlert: false, message: 'pending' };
            } else {
                if (flapState.elevatedCount > 0) {
                    console.log(`[SolarwindsAlertDetector] ${elementName} returned to normal (was pending at ${flapState.pendingValue})`);
                }
                flapState.elevatedCount = 0;
                flapState.pendingValue = null;
                return { shouldAlert: false, message: null };
            }
        },

        // Main check function
        performCheck() {
            const val1 = this.parseValue(SELECTORS.element1);
            const val2 = this.parseValue(SELECTORS.element2);

            const timestamp = new Date().toLocaleTimeString();
            console.log(`[SolarwindsAlertDetector] [${timestamp}] Current values: Element1=${val1}, Element2=${val2}`);

            let shouldAlert = false;

            const result1 = this.checkElementWithFlap(
                'Element1',
                val1,
                this.lastValues.element1,
                this.flapState.element1
            );
            if (result1.shouldAlert) {
                shouldAlert = true;
                if (val1 !== null) this.lastValues.element1 = val1;
                this.flapState.element1.elevatedCount = 0;
                this.flapState.element1.pendingValue = null;
            }

            const result2 = this.checkElementWithFlap(
                'Element2',
                val2,
                this.lastValues.element2,
                this.flapState.element2
            );
            if (result2.shouldAlert) {
                shouldAlert = true;
                if (val2 !== null) this.lastValues.element2 = val2;
                this.flapState.element2.elevatedCount = 0;
                this.flapState.element2.pendingValue = null;
            }

            if (shouldAlert) {
                this.speak("What's up, Solarwinds Alert Detected");
            } else if (result1.message !== 'pending' && result2.message !== 'pending') {
                console.log("[SolarwindsAlertDetector] No increase detected");
            }

            return { val1, val2, alerted: shouldAlert };
        },

        // Initialize - capture current state without announcing
        initialize() {
            this.lastValues.element1 = this.parseValue(SELECTORS.element1);
            this.lastValues.element2 = this.parseValue(SELECTORS.element2);

            console.log(`[SolarwindsAlertDetector] Initialized with values: Element1=${this.lastValues.element1}, Element2=${this.lastValues.element2}`);
        },

        // Start periodic checking
        start(intervalSeconds = 60) {
            if (this.isRunning) {
                console.log("[SolarwindsAlertDetector] Already running.");
                return;
            }

            this.initialize();
            this.isRunning = true;

            this.checkInterval = setInterval(() => {
                this.performCheck();
            }, intervalSeconds * 1000);

            console.log(`[SolarwindsAlertDetector] Started watching. Checking every ${intervalSeconds} seconds.`);
            this.speak("Solarwinds Alert Detector started");
        },

        // Stop periodic checking
        stop() {
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
            }
            this.isRunning = false;
            console.log("[SolarwindsAlertDetector] Stopped watching.");
        },

        // Reset last seen values and flap state
        reset() {
            this.lastValues.element1 = null;
            this.lastValues.element2 = null;
            this.flapState.element1 = { elevatedCount: 0, pendingValue: null };
            this.flapState.element2 = { elevatedCount: 0, pendingValue: null };
            console.log("[SolarwindsAlertDetector] Reset last seen values and flap state.");
        },

        // Set the flap detection threshold
        setFlapThreshold(n) {
            if (typeof n !== 'number' || n < 1) {
                console.error("[SolarwindsAlertDetector] Flap threshold must be a positive number");
                return;
            }
            this.flapThreshold = n;
            console.log(`[SolarwindsAlertDetector] Flap threshold set to ${n} consecutive checks`);
        },

        // Run a single check manually
        checkNow() {
            return this.performCheck();
        },

        // Show current status
        status() {
            const val1 = this.parseValue(SELECTORS.element1);
            const val2 = this.parseValue(SELECTORS.element2);

            console.log("[SolarwindsAlertDetector] Status:");
            console.log(`  Running: ${this.isRunning}`);
            console.log(`  Flap threshold: ${this.flapThreshold} consecutive checks`);
            console.log(`  Last values: Element1=${this.lastValues.element1}, Element2=${this.lastValues.element2}`);
            console.log(`  Current values: Element1=${val1}, Element2=${val2}`);
            console.log(`  Flap state Element1: ${this.flapState.element1.elevatedCount}/${this.flapThreshold} checks at value ${this.flapState.element1.pendingValue}`);
            console.log(`  Flap state Element2: ${this.flapState.element2.elevatedCount}/${this.flapThreshold} checks at value ${this.flapState.element2.pendingValue}`);

            return {
                running: this.isRunning,
                flapThreshold: this.flapThreshold,
                lastValues: { ...this.lastValues },
                currentValues: { element1: val1, element2: val2 },
                flapState: {
                    element1: { ...this.flapState.element1 },
                    element2: { ...this.flapState.element2 }
                }
            };
        }
    };

    // Expose to global scope
    window.SolarwindsAlertDetector = SolarwindsAlertDetector;

    console.log(`[SolarwindsAlertDetector] === Solarwinds Alert Detector v${SolarwindsAlertDetector.version} Loaded ===`);
    console.log("[SolarwindsAlertDetector] Flap detection enabled: alerts require 5 consecutive elevated checks");
    console.log("[SolarwindsAlertDetector] Commands:");
    console.log("[SolarwindsAlertDetector]   SolarwindsAlertDetector.start(60)     - Start watching (check every 60 seconds)");
    console.log("[SolarwindsAlertDetector]   SolarwindsAlertDetector.stop()        - Stop watching");
    console.log("[SolarwindsAlertDetector]   SolarwindsAlertDetector.checkNow()    - Run a single check now");
    console.log("[SolarwindsAlertDetector]   SolarwindsAlertDetector.reset()       - Clear last seen values and flap state");
    console.log("[SolarwindsAlertDetector]   SolarwindsAlertDetector.status()      - Show current values and flap state");
    console.log("[SolarwindsAlertDetector]   SolarwindsAlertDetector.setFlapThreshold(n) - Set consecutive checks required (default: 5)");

    // Auto-start watching on load
    console.log("[SolarwindsAlertDetector] Auto-starting in 2 seconds...");
    setTimeout(() => {
        SolarwindsAlertDetector.start(60);
    }, 2000);
})();
