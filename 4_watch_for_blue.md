# Watch for Blue (Outlook Email Monitor)

A Python script that monitors a user-defined screen region for new Outlook emails by detecting changes in blue pixel counts. When new emails arrive, the unread count indicator in Outlook changes, which this script detects by counting specific blue-colored pixels. It then announces "You've got mail!" using text-to-speech.

## Why This Exists
Outlook doesn't always provide reliable desktop notifications. This script provides an audible alert whenever the blue unread indicator pixels increase in the monitored region, ensuring you never miss an incoming email.

## Setup
1. Run the script: `python 4_watch_for_blue.py`
2. Position your mouse at the **top-left corner** of the Outlook inbox/folder pane area you want to monitor
3. Press `Ctrl+`` to record that position
4. Move your mouse to the **bottom-right corner** of that same area
5. Press `Ctrl+`` again to complete the region selection
6. The script will now monitor that region every 10 seconds

## How It Works

### Blue Pixel Detection
The script captures a screenshot of the defined region every 10 seconds and counts pixels that match Outlook's specific blue colors:
- `RGB(0, 90, 176)`
- `RGB(0, 90, 170)`
- `RGB(46, 90, 158)`

These colors correspond to Outlook's unread email count badges. If the count of blue pixels **increases** compared to the previous check, the script uses `pyttsx3` to announce "You've got mail!" three times with a 1-second pause between each.

### Inbox Visibility Check
The script also performs image matching to verify the inbox button is visible on screen (using `images/inbox.png` and `images/inbox_highlighted.png` templates). This helps detect when Outlook has scrolled away from the inbox view.

If the inbox button isn't detected for a configurable interval (default: 3 minutes, checked every 10 seconds = 18 checks), the script will either:
1. Attempt to automatically scroll back to the inbox (see below), or
2. Announce "Inbox refresh may be needed" if auto-scroll fails

### Auto-Find Inbox Feature
When the inbox hasn't been visible for too long, the script attempts to recover automatically:

1. **Idle Check**: Waits up to 10 seconds, checking each second for mouse movement. If the user is actively using the mouse, it aborts to avoid interrupting their work.
2. **Announce**: Uses text-to-speech to say "Attempting to look for the inbox"
3. **Hover**: Moves the mouse to the bottom-left area of the defined region (offset by +30px x, -30px y)
4. **Arrow Check**: Looks for `images/outlook_down_arrow.png` in the region. If not found, aborts.
5. **Scroll**: Scrolls up 30 units, pauses, then scrolls down 12 units to navigate the folder list
6. **Verify**: Checks if the inbox button is now visible. If found, resets the warning counter.

## Configuration
The script has a configurable variable at line 351:
- `refresh_warning_minutes_interval = 3` — How many minutes without seeing the inbox before alerting/attempting recovery

## Required Image Templates
Place these in an `images/` subdirectory:
- `inbox.png` — Screenshot of the Outlook inbox button (normal state)
- `inbox_highlighted.png` — Screenshot of the inbox button when highlighted/selected
- `outlook_down_arrow.png` — Screenshot of the down arrow used in Outlook's folder navigation

## Dependencies
```
pip install keyboard pynput Pillow numpy mss pyttsx3
```

- `keyboard` — Global hotkey registration (`Ctrl+``)
- `pynput` — Mouse position reading, movement, and scrolling
- `Pillow` (PIL) — Image processing for template matching
- `numpy` — Pixel array comparison for exact image matching
- `mss` — Fast cross-platform screen capture
- `pyttsx3` — Offline text-to-speech engine