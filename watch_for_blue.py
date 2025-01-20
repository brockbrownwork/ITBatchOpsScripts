import keyboard
from pynput.mouse import Controller
from PIL import Image
import numpy as np
import time
import sys
import mss
from time import sleep
from datetime import datetime
from chord import play_chord

# This script:
# 1. Allows you to press Ctrl+~ to record the mouse position as the top-left corner of a box.
# 2. Press Ctrl+~ again to record the mouse position as the bottom-right corner of a box.
# 3. Every 10 seconds, it will analyze that region of the screen to count how many (255,0,0) blue pixels are present.
# 4. If the count of blue pixels increases compared to the previous measurement, it plays a diminished chord.

# Global variables to store corner coordinates
top_left = None
bottom_right = None
mouse = Controller()

# We will track how many times the hotkey has been pressed
corner_press_count = 0

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

# Set the hotkey to Ctrl+~
keyboard.add_hotkey('ctrl+`', capture_mouse_position)  # On most keyboards, ~ is shift+`, so ctrl+` might suffice.

def count_blue_pixels(top_left, bottom_right):
    # Ensure coordinates are integers
    x1, y1 = int(top_left[0]), int(top_left[1])
    x2, y2 = int(bottom_right[0]), int(bottom_right[1])

    width = x2 - x1
    height = y2 - y1

    if width <= 0 or height <= 0:
        print("Invalid box dimensions. Make sure bottom-right is actually to the bottom-right of top-left.")
        return 0

    with mss.mss() as sct:
        region = {"top": y1, "left": x1, "width": width, "height": height}
        sct_img = sct.grab(region)
        img = Image.frombytes("RGB", (sct_img.width, sct_img.height), sct_img.rgb)
        arr = np.array(img)

    # Count how many pixels are exactly (255,0,0)
    # arr is shape (height, width, 3)
    # We'll create a boolean mask
    blue_pixels = 0
    colors = [
        (0, 90, 176),
        (0, 90, 170),
        (46, 90, 158)
    ]

    for color in colors:
        blue_pixels += np.sum((arr[:, :, 0] == color[0]) & (arr[:, :, 1] == color[1]) & (arr[:, :, 2] == color[2]))

    return blue_pixels

def play_diminished_chord():
    # Example: C diminished chord frequencies: C (261.63 Hz), Eb (311.13 Hz), Gb (369.99 Hz)
    diminished_frequencies = [261.63, 311.13, 369.99]
    play_chord(diminished_frequencies, duration=2, fade_duration=0.5)

def play_minor_7_chord():
    frequencies = [220.0, 261.6255653005986, 329.6275569128699, 391.99543598174927]
    frequencies = [f * pow(2,1/12) for f in frequencies]
    play_chord(frequencies, duration = 2, fade_duration = 0.5)

print("Press Ctrl+` once to set the top-left corner, then again to set the bottom-right corner.")

old_count = None

# Main loop:
while True:
    # Wait until both corners are set
    if top_left is not None and bottom_right is not None:
        # Once both corners are available, start analyzing every 10 seconds
        new_count = count_blue_pixels(top_left, bottom_right)
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] blue pixel count: {new_count}")
        
        if old_count is not None:
            if new_count > old_count:
                print("Blue pixels increased! Playing sound...")
                play_minor_7_chord()
            else:
                print("No increase in blue pixels.")

        old_count = new_count
        # Wait 10 seconds before next check
        sleep(10)
    else:
        # If corners not set yet, just wait and check again
        sleep(1)
