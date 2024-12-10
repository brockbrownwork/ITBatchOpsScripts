import keyboard
from pynput.mouse import Controller
from PIL import Image
import numpy as np
import time
import sys
import mss
from time import sleep
from datetime import datetime
from chords import play_chord
import pytesseract

# This script:
# 1. Allows you to press Ctrl+~ to record the mouse position as the top-left corner of a box.
# 2. Press Ctrl+~ again to record the mouse position as the bottom-right corner of a box.
# 3. Once the region is defined, it will:
#    - Show you the image of the first captured region (only once, right after the corners are set).
#    - Every 10 seconds, it will analyze that region of the screen to count how many (255,0,0) red pixels are present.
#    - It will use pytesseract to read the text in the region.
#      If the text contains "UNMATCHED" or "AWSCLT", it will NOT make the sound even if red pixels increased.
#    - If the red pixel count has increased since the last check AND the text does not contain the above substrings,
#      it will play a diminished chord.
#
# Modification per user request:
# If the new_count is less than the old_count, set old_count to new_count. This serves as a form of resetting the baseline
# so that future increases will still trigger the alert.

top_left = None
bottom_right = None
mouse = Controller()
corner_press_count = 0
image_shown = False  # To ensure we show the captured image only once

def capture_mouse_position():
    global corner_press_count, top_left, bottom_right
    pos = mouse.position
    if corner_press_count == 0:
        top_left = pos
        print(f"Top-left corner set at {top_left}")
    elif corner_press_count == 1:
        bottom_right = pos
        print(f"Bottom-right corner set at {bottom_right}")
    corner_press_count += 1

# Set the hotkey to Ctrl+`
keyboard.add_hotkey('ctrl+`', capture_mouse_position)

def capture_region(top_left, bottom_right):
    # Ensure coordinates are integers
    x1, y1 = int(top_left[0]), int(top_left[1])
    x2, y2 = int(bottom_right[0]), int(bottom_right[1])

    width = x2 - x1
    height = y2 - y1

    if width <= 0 or height <= 0:
        print("Invalid box dimensions. Make sure bottom-right is actually to the bottom-right of top-left.")
        return None, None

    with mss.mss() as sct:
        region = {"top": y1, "left": x1, "width": width, "height": height}
        sct_img = sct.grab(region)
        img = Image.frombytes("RGB", (sct_img.width, sct_img.height), sct_img.rgb)
        arr = np.array(img)
    return img, arr

def count_red_pixels(arr):
    # arr is a numpy array of shape (height, width, 3)
    # Count how many pixels are exactly (255,0,0)
    red_pixels = np.sum((arr[:,:,0] == 255) & (arr[:,:,1] == 0) & (arr[:,:,2] == 0))
    return red_pixels

def play_diminished_chord():
    # Example: C diminished chord frequencies: C (261.63 Hz), Eb (311.13 Hz), Gb (369.99 Hz)
    diminished_frequencies = [261.63, 311.13, 369.99]
    play_chord(diminished_frequencies, duration=2, fade_duration=0.5)

print("Press Ctrl+` once to set the top-left corner, then again to set the bottom-right corner.")

old_count = None

while True:
    if top_left is not None and bottom_right is not None:
        # Capture the region image
        img, arr = capture_region(top_left, bottom_right)
        if img is None:
            # Invalid region, just wait and try again
            sleep(1)
            continue

        # Show the image once
        if not image_shown:
            img.show()
            image_shown = True

        # Extract text with pytesseract
        text = pytesseract.image_to_string(img)
        text_upper = text.upper().strip()

        new_count = count_red_pixels(arr)
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Red pixel count: {new_count}")

        if old_count is not None:
            if new_count > old_count:
                # Check if text contains "UNMATCHED" or "AWSCLT"
                if "UNMATCHED" in text_upper or "AWSCLT" in text_upper:
                    print("Text contains 'UNMATCHED' or 'AWSCLT'. Not playing sound.")
                else:
                    print("Red pixels increased and text does not contain forbidden words. Playing diminished chord...")
                    play_diminished_chord()
                # Update old_count because we've detected a new higher baseline
                old_count = new_count
            else:
                # If new_count < old_count, reset old_count to new_count
                if new_count < old_count:
                    print("Red pixel count decreased, resetting baseline.")
                    old_count = new_count
                else:
                    # new_count == old_count, no change
                    print("No increase in red pixels. Baseline remains the same.")
                    # old_count remains unchanged
        else:
            # This is the first measurement
            old_count = new_count

        sleep(10)
    else:
        # If corners not set yet, just wait
        sleep(1)
