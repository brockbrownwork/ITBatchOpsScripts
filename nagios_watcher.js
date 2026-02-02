/**
 * Nagios Watcher - Standalone Version
 *
 * Monitors two host status elements on the Nagios page and announces via TTS
 * when either value increases from its previous state.
 *
 * Includes flap detection: alerts only trigger after the elevated count persists
 * for a configurable number of consecutive checks (default: 5). This prevents
 * false alarms from transient spikes that resolve themselves.
 *
 * Usage:
 *   - Paste this script into the browser console on the Nagios page
 *   - Or include it as a <script> tag
 *
 * Commands:
 *   NagiosWatcher.start(30)     - Start watching (check every 30 seconds)
 *   NagiosWatcher.stop()        - Stop watching
 *   NagiosWatcher.checkNow()    - Run a single check now
 *   NagiosWatcher.reset()       - Clear last seen values and flap state
 *   NagiosWatcher.status()      - Show current values and flap state
 *   NagiosWatcher.setFlapThreshold(n) - Set consecutive checks required (default: 5)
 */

(function() {
    'use strict';

    const NagiosWatcher = {
        version: "1.2",
        lastValues: {
            element1: null,
            element2: null
        },
        // Flap detection: track consecutive elevated checks
        flapState: {
            element1: { elevatedCount: 0, pendingValue: null },
            element2: { elevatedCount: 0, pendingValue: null }
        },
        flapThreshold: 5, // Number of consecutive checks before alerting
        isRunning: false,
        checkInterval: null,

        // Recursive frame crawler - drills through frames and iframes
        findElementRecursive(doc, selector) {
            let el = doc.querySelector(selector);
            if (el) return el;

            const frames = doc.querySelectorAll('frame, iframe');
            for (let i = 0; i < frames.length; i++) {
                try {
                    const frameDoc = frames[i].contentDocument || frames[i].contentWindow.document;
                    const found = this.findElementRecursive(frameDoc, selector);
                    if (found) return found;
                } catch (e) {
                    // Cross-origin security block
                }
            }
            return null;
        },

        // Get the two elements we're watching
        getElements() {
            const el1 = this.findElementRecursive(document, '.serviceunknown');
            const el2 = this.findElementRecursive(document, '.servicecritical');

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

        // Check a single element for increase with flap detection
        checkElementWithFlap(elementName, currentValue, lastValue, flapState) {
            // No data to compare
            if (currentValue === null || lastValue === null) {
                return { shouldAlert: false, message: null };
            }

            const isElevated = currentValue > lastValue;

            if (isElevated) {
                // Value is elevated - track it
                if (flapState.pendingValue === null || currentValue !== flapState.pendingValue) {
                    // New elevation or different elevated value - start fresh count
                    flapState.pendingValue = currentValue;
                    flapState.elevatedCount = 1;
                    console.log(`[NagiosWatcher] ${elementName} elevated: ${lastValue} -> ${currentValue} (check 1/${this.flapThreshold})`);
                } else {
                    // Same elevated value persists
                    flapState.elevatedCount++;
                    console.log(`[NagiosWatcher] ${elementName} still elevated at ${currentValue} (check ${flapState.elevatedCount}/${this.flapThreshold})`);
                }

                // Check if we've met the threshold
                if (flapState.elevatedCount >= this.flapThreshold) {
                    console.warn(`[NagiosWatcher] ${elementName} confirmed increase: ${lastValue} -> ${currentValue} (persisted ${flapState.elevatedCount} checks)`);
                    return { shouldAlert: true, confirmedValue: currentValue };
                }

                return { shouldAlert: false, message: 'pending' };
            } else {
                // Value is back to normal or decreased - reset flap state
                if (flapState.elevatedCount > 0) {
                    console.log(`[NagiosWatcher] ${elementName} returned to normal (was pending at ${flapState.pendingValue})`);
                }
                flapState.elevatedCount = 0;
                flapState.pendingValue = null;
                return { shouldAlert: false, message: null };
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

            // Check element 1 with flap detection
            const result1 = this.checkElementWithFlap(
                'Element1 (Unknown)',
                val1,
                this.lastValues.element1,
                this.flapState.element1
            );
            if (result1.shouldAlert) {
                shouldAlert = true;
                // Update baseline after confirmed alert
                if (val1 !== null) this.lastValues.element1 = val1;
                this.flapState.element1.elevatedCount = 0;
                this.flapState.element1.pendingValue = null;
            }

            // Check element 2 with flap detection
            const result2 = this.checkElementWithFlap(
                'Element2 (Critical)',
                val2,
                this.lastValues.element2,
                this.flapState.element2
            );
            if (result2.shouldAlert) {
                shouldAlert = true;
                // Update baseline after confirmed alert
                if (val2 !== null) this.lastValues.element2 = val2;
                this.flapState.element2.elevatedCount = 0;
                this.flapState.element2.pendingValue = null;
            }

            // Alert if either value had a confirmed increase
            if (shouldAlert) {
                this.speak("Attention: Check Nagios");
            } else if (result1.message !== 'pending' && result2.message !== 'pending') {
                console.log("[NagiosWatcher] No increase detected");
            }

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

        // Reset last seen values and flap state
        reset() {
            this.lastValues.element1 = null;
            this.lastValues.element2 = null;
            this.flapState.element1 = { elevatedCount: 0, pendingValue: null };
            this.flapState.element2 = { elevatedCount: 0, pendingValue: null };
            console.log("[NagiosWatcher] Reset last seen values and flap state.");
        },

        // Set the flap detection threshold
        setFlapThreshold(n) {
            if (typeof n !== 'number' || n < 1) {
                console.error("[NagiosWatcher] Flap threshold must be a positive number");
                return;
            }
            this.flapThreshold = n;
            console.log(`[NagiosWatcher] Flap threshold set to ${n} consecutive checks`);
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
    window.NagiosWatcher = NagiosWatcher;

    console.log(`[NagiosWatcher] === Nagios Watcher v${NagiosWatcher.version} Loaded ===`);
    console.log("[NagiosWatcher] Flap detection enabled: alerts require 5 consecutive elevated checks");
    console.log("[NagiosWatcher] Commands:");
    console.log("[NagiosWatcher]   NagiosWatcher.start(30)     - Start watching (check every 30 seconds)");
    console.log("[NagiosWatcher]   NagiosWatcher.stop()        - Stop watching");
    console.log("[NagiosWatcher]   NagiosWatcher.checkNow()    - Run a single check now");
    console.log("[NagiosWatcher]   NagiosWatcher.reset()       - Clear last seen values and flap state");
    console.log("[NagiosWatcher]   NagiosWatcher.status()      - Show current values and flap state");
    console.log("[NagiosWatcher]   NagiosWatcher.setFlapThreshold(n) - Set consecutive checks required (default: 2)");

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
