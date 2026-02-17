# ITBatchOpsScripts

IT Batch Operations Scripts - A collection of automation scripts for IT operations monitoring and workflow management at Signet Jewelers.

## Project Structure

```
ITBatchOpsScripts/
├── 00_run_all_numbered.bat    # Launcher for all numbered startup scripts
├── 0_check_for_updates.bat    # Git pull for updates
├── 1_caffeine.py              # Keeps system awake (F15 key every 10 min)
├── 2_critical_job_reminders.py # Scheduled job alerts with TTS and GUI
├── 3_Susejboot.bat            # Opens work apps (Outlook, Jira, RMJ, Teams, etc.)
├── 4_watch_for_blue.py        # Outlook email notification watcher
├── wikiwikialoha/             # Flask-SocketIO server for client coordination
│   ├── server.py              # WebSocket server on port 5001
│   ├── python_clients/        # Python SocketIO clients
│   └── js_clients/            # JavaScript SocketIO clients
├── images/                    # Template images for screen detection
├── check_maestro*.py          # Maestro system monitoring
├── ping_hp*.py                # Server ping utilities
├── runmyjobs.js               # RunMyJobs automation
├── opsgenie.js                # OpsGenie integration
├── jira_alert_creator.js      # Jira alert automation
├── tws_abend_watcher.js       # Standalone TWS job error watcher (ABEND/FAIL/CANCEL)
├── tws_table_display.js       # TWS table viewer with filtering
├── nagios_watcher.js          # Nagios host status watcher with TTS alerts
├── solarwinds_alert_detector.js # Solarwinds dashboard alert watcher with TTS alerts
├── detect_scenes.py           # Video scene change detector (jump-bisect + CuPy GPU)
├── random_sb_sound.py         # Random sound player from Strong Bad email songs
├── scene_timestamps.csv       # Detected scene change timestamps
├── chord.py                   # Audio utility for playing chords (used by reminders)
└── merge pdf.py               # PDF merging utility
```

## Key Scripts

### Startup Scripts (numbered)

Run `00_run_all_numbered.bat` to launch all startup scripts in separate windows:
- **0**: Git pull for code updates
- **1**: Caffeine - prevents system sleep
- **2**: Critical job reminders - scheduled alerts for batch jobs
- **3**: Susejboot - opens standard work applications
- **4**: Watch for blue - monitors Outlook for new emails

### 2_critical_job_reminders.py

Scheduled reminder system using:
- `schedule` library for time-based alerts
- `tkinter` GUI popups with copy-to-clipboard
- Sound alerts via `sounddevice` (plays Fsus4 chord)
- Reads job schedules from `critical_jobs_schedule.csv`

### 4_watch_for_blue.py

Outlook email notification watcher:
- Uses `mss` for screen capture
- Exact pixel matching for inbox detection
- Magic wand selection algorithm for unread message detection
- Text-to-speech alerts via `pyttsx3`
- Hotkey: `Ctrl+\`` to set monitoring region

### runmyjobs.js

RunMyJobs automation script for job management and monitoring:
- **Copy Jobs**: Finds selected row's folder, collects all job definitions above it in the same folder, copies unique job names to clipboard
- **Job name alerts**: Warns on ABAP jobs (DevOps chat), ZFI_ jobs (DevOps chat), and `_CONT` suffix jobs (controller job warning to check for controller page)
- **Run monitor**: Polls for new "Run End" times and announces via TTS when new completions appear
- Hijacks Ctrl+C (when no text selected) and Ctrl+Shift+C for quick job copying
- Shift+Alt+C copies only the single selected job's definition
- Paste trimming: auto-trims whitespace on paste
- UI: Adds a floating "Copy Jobs" button
- Commands: `startRunMonitor()`, `toggleDebugMode()`, `clickRefreshButton()`
- Usage: Paste into browser console or include as `<script>` tag on RunMyJobs page

### tws_abend_watcher.js

Standalone script for monitoring TWS job table for error states:
- Watches for jobs in ABEND, FAIL, CANCEL, or CANCELLED states
- Uses recursive frame crawler to navigate nested `<html>` and `<frame>` elements
- Fallback table selectors for varying page structures
- Tracks seen entries by Job/State/Sched Time with occurrence counting
- Text-to-speech alerts via Web Speech API when new problem jobs appear
- Checks for new entries, then refreshes page for next cycle
- Auto-starts on load after 2 second delay
- Alerts if table not found for 5 consecutive checks
- **Frequent failers list**: Jobs in `frequentFailers` array get a "This one fails regularly" TTS note
- **Special instructions**: Per-job console instructions (e.g., JSISADS_MKT_DAILY prints cancel steps for JMKT015 and JSIS215)
- Commands: `TWSAbendWatcher.start(30)`, `.stop()`, `.checkNow()`, `.reset()`
- Usage: Paste into browser console or include as `<script>` tag on TWS page

### tws_table_display.js

TWS table viewer for displaying and filtering all jobs:
- Uses same recursive frame crawler as tws_abend_watcher.js
- Displays full table with `console.table` formatting
- Filter by any text, by State, or by Job name
- PDF export with `downloadPDF()` method
- Special PDF filenames: "Workstations" → `01_workstations.pdf`, "Carry forward" → `02_carry forward.pdf`, "Priority zero jobstreams" → `03_priority_zero_jobstreams.pdf`, "Priority zero jobs" → `04_priority_zero_jobs.pdf`, "Abends" → `05_abends.pdf`, "Executing" → `06_executing.pdf`
- Commands: `TWSTableDisplay.show()`, `.byState('SUCC')`, `.byJob('NAME')`, `.columns()`, `.refresh()`, `.downloadPDF()`, `.downloadPDF('abends')`
- Usage: Paste into browser console or include as `<script>` tag on TWS page

### nagios_watcher.js

Nagios host status watcher for monitoring service states:
- Watches `.serviceunknown` and `.servicecritical` elements for count increases
- Uses recursive frame crawler to navigate nested `<frame>` and `<iframe>` elements
- Text-to-speech alerts via Web Speech API when counts increase
- **Flap detection**: Alerts only trigger after elevated counts persist for multiple consecutive checks (default: 5), preventing false alarms from transient spikes
- Auto-starts on load after 2 second delay
- Commands: `NagiosWatcher.start(30)`, `.stop()`, `.checkNow()`, `.reset()`, `.status()`, `.setFlapThreshold(n)`
- Usage: Paste into browser console or include as `<script>` tag on Nagios page

### solarwinds_alert_detector.js

Solarwinds dashboard alert watcher for monitoring two count elements:
- Polls two specific span elements on the Solarwinds dashboard for count increases
- Parses counts from parenthesized text via `.slice(1, -1)`
- Text-to-speech alerts via Web Speech API: "What's up, Solarwinds Alert Detected"
- TTS announcement on script start
- **Flap detection**: Alerts only trigger after elevated counts persist for multiple consecutive checks (default: 5), preventing false alarms from transient spikes
- Default poll interval: 60 seconds
- Auto-starts on load after 2 second delay
- Commands: `SolarwindsAlertDetector.start(60)`, `.stop()`, `.checkNow()`, `.reset()`, `.status()`, `.setFlapThreshold(n)`
- Usage: Paste into browser console or include as `<script>` tag on Solarwinds page

### detect_scenes.py

Video scene change detector for slideshow-style videos:
- Uses jump-and-bisect strategy: jumps ~2s at a time, binary searches for exact frame boundaries
- GPU-accelerated frame comparison via CuPy (percentage of pixels changed above noise floor)
- Outputs timestamps to `scene_timestamps.csv`
- Configurable: `--threshold` (% pixels changed), `--noise-floor` (per-pixel ignore), `--min-clip` (minimum clip length), `--skip` (skip first N seconds)
- `--debug` flag prints details when changes are found
- Usage: `python detect_scenes.py --video "strong bad email songs.mov"`

### random_sb_sound.py

Plays a random sound segment from Strong Bad email songs:
- Reads `scene_timestamps.csv` for segment boundaries
- Extracts segment directly from WAV in memory (no intermediate files)
- Plays via Pygame mixer
- `--list` flag shows all segments with timestamps and durations
- Importable: `from random_sb_sound import play_random_clip`
- Usage: `python random_sb_sound.py`

### wikiwikialoha

Flask-SocketIO server for coordinating automation clients:
- Runs on port 5001
- Supports client identification and dynamic scaling
- Fire-and-forget and request-response patterns
- Test endpoints: `/test/fire-forget/<client>/<action>`, `/test/request-response/<client>/<action>`

## Dependencies

Install via: `pip install -r requirements.txt`

Key packages:
- `Flask`, `Flask-Cors` - Web server
- `keyboard`, `pynput`, `PyAutoGUI` - Input automation
- `mss`, `Pillow`, `numpy` - Screen capture and image processing
- `pyttsx3` - Text-to-speech
- `schedule` - Job scheduling
- `sounddevice` - Audio playback
- `pyperclip` - Clipboard operations
- `pygame` - Audio playback (random sound player)
- `cupy` - GPU-accelerated numpy (scene detection)
- `scenedetect`, `opencv-python` - Video processing

## Development Notes

- Windows-only (uses Windows-specific paths and tools)
- Screen coordinates are specific to the user's monitor setup
- Template images in `images/` folder must match exact pixels
- Network drives use `jewels.local` domain
- Connects to internal URLs: `rhesprodtws01`, `pwakslwnapp01.jewels.com`, etc.

## Common Tasks

**Adding a new job reminder:**
Edit `2_critical_job_reminders.py` - use `schedule_job_alert(name, time, days)`

**Updating template images:**
Replace images in `images/` folder - must be exact pixel matches

**Testing wikiwikialoha server:**
```bash
cd wikiwikialoha
python server.py
# Access http://localhost:5001
```
