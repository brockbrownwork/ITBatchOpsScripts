import keyboard
from pynput.mouse import Controller, Listener as MouseListener
from pynput.keyboard import Listener as KeyboardListener
from PIL import Image
import numpy as np
import time
import sys
import mss
from time import sleep
from datetime import datetime
import pyttsx3
import pyautogui
import threading

engine = pyttsx3.init()

# --- USER ACTIVITY DETECTION ---
last_activity_time = time.time()
activity_lock = threading.Lock()

def _on_mouse_move(x, y):
    global last_activity_time
    with activity_lock:
        last_activity_time = time.time()

def _on_mouse_click(x, y, button, pressed):
    global last_activity_time
    with activity_lock:
        last_activity_time = time.time()

def _on_key_press(key):
    global last_activity_time
    with activity_lock:
        last_activity_time = time.time()

# Start listeners in daemon threads
mouse_listener = MouseListener(on_move=_on_mouse_move, on_click=_on_mouse_click)
mouse_listener.daemon = True
mouse_listener.start()

keyboard_listener = KeyboardListener(on_press=_on_key_press)
keyboard_listener.daemon = True
keyboard_listener.start()

def user_was_active_recently(seconds=10):
    """Returns True if user mouse movement or keystrokes were detected within the last `seconds`."""
    with activity_lock:
        return (time.time() - last_activity_time) < seconds

# --- IMAGE DETECTION HELPER ---
def image_exists_on_screen(image_path, region=None):
    """
    Check if an image exists on screen (or within a region).

    Args:
        image_path: Path to the template image.
        region: Optional dict with top, left, width, height. If None, searches full screen.

    Returns:
        True if the image is found, False otherwise.
    """
    try:
        needle_pil = Image.open(image_path).convert("RGB")
        needle_arr = np.array(needle_pil)
    except FileNotFoundError:
        print(f"Warning: Template image not found at {image_path}")
        return False
    except Exception as e:
        print(f"Error loading template image {image_path}: {e}")
        return False

    try:
        with mss.mss() as sct:
            if region:
                sct_img = sct.grab(region)
            else:
                sct_img = sct.grab(sct.monitors[0])  # Full screen
            haystack_pil = Image.frombytes("RGB", (sct_img.width, sct_img.height), sct_img.rgb)
            haystack_arr = np.array(haystack_pil)
    except Exception as e:
        print(f"Error capturing screen: {e}")
        return False

    return _find_exact_match(haystack_arr, needle_arr)


# --- NEW HELPER FUNCTION ---
def _find_exact_match(haystack_arr, needle_arr):
    """
    Searches a larger numpy array (haystack) for an exact match of a
    smaller numpy array (needle).

    Args:
        haystack_arr: The numpy array of the screen region.
        needle_arr: The numpy array of the template image to find.

    Returns:
        True if an exact match is found, otherwise False.
    """
    H, W, _ = haystack_arr.shape
    h, w, _ = needle_arr.shape

    # Check if needle is larger than haystack
    if h > H or w > W:
        return False

    # Iterate through all possible top-left positions
    for y in range(H - h + 1):
        for x in range(W - w + 1):
            # Get the sub-region from the haystack
            sub_array = haystack_arr[y : y + h, x : x + w]
            
            # Perform an exact pixel-by-pixel comparison
            if np.array_equal(sub_array, needle_arr):
                return True
                
    # No match found after checking all positions
    return False

# --- MODIFIED FUNCTION ---
def inbox_button_exists(
    region_top_left,
    region_bottom_right,
):
    """
    Checks for the presence of either an un-highlighted or highlighted inbox image
    within a specified region of the screen using exact pixel matching.
    Returns True if found, False otherwise.

    Args:
        region_top_left: A 2-tuple (x, y) of the top-left coordinates of the search area.
        region_bottom_right: A 2-tuple (x, y) of the bottom-right coordinates of the search area.

    Returns:
        True if an image is found, otherwise False.
    """
    
    # 1. Define the screen region to capture
    x1, y1 = int(region_top_left[0]), int(region_top_left[1])
    x2, y2 = int(region_bottom_right[0]), int(region_bottom_right[1])

    width = x2 - x1
    height = y2 - y1

    if width <= 0 or height <= 0:
        print("Invalid search region. Make sure bottom-right is after top-left.")
        return False

    search_region = {"top": y1, "left": x1, "width": width, "height": height}

    # 2. Capture the "haystack" (the screen region)
    try:
        with mss.mss() as sct:
            sct_img = sct.grab(search_region)
            # Convert to PIL Image and then to RGB numpy array
            haystack_pil = Image.frombytes("RGB", (sct_img.width, sct_img.height), sct_img.rgb)
            haystack_arr = np.array(haystack_pil)
    except Exception as e:
        print(f"Error capturing screen region: {e}")
        return False # Cannot proceed if screen grab fails

    # 3. Define the "needles" (the template images)
    image_paths = [
        'images/inbox.png',
        'images/inbox_highlighted.png'
    ]

    # 4. Loop through each needle and search for it
    for path in image_paths:
        try:
            # Load needle image
            needle_pil = Image.open(path)
            # Convert to RGB to ensure it matches the haystack format (discarding alpha)
            needle_pil = needle_pil.convert("RGB")
            # Convert to numpy array
            needle_arr = np.array(needle_pil)

            # Use the helper function to find an exact match
            if _find_exact_match(haystack_arr, needle_arr):
                return True # Found a match
                
        except FileNotFoundError:
            print(f"Warning: Template image not found at {path}")
            pass # Try the next image
        except Exception as e:
            print(f"Error processing template image {path}: {e}")
            pass # Try the next image

    # --- 5. Neither image was found ---
    return False

def email_alert(refresh_inbox_needed = False):
    """Uses text-to-speech to announce the alert message three times."""
    message = "You've got mail!"
    if refresh_inbox_needed:
        message = "Inbox refresh may be needed."
    # Say the message three times
    for _ in range(3):
        engine.say(message)
        print(message)
        engine.runAndWait()
        engine.stop()
        time.sleep(1) # A short pause between repetitions


def attempt_to_find_inbox(region_top_left, region_bottom_right):
    """
    Attempt to find the inbox button per the specification in 4_watch_for_blue.md.

    I. Hover Mouse
       - If user mouse/keyboard activity detected in last 10 seconds, announce and proceed
       - Else return False
       - Hover over bottom-left of box (x+10, y-10)
       - If outlook_down_arrow.png exists on screen, go to II
       - Else return False

    II. Scroll and Locate
       - Scroll up 30 scrolls, then scroll down 12
       - If inbox.png or inbox_highlighted.png are on screen, return True
       - Else return False

    Args:
        region_top_left: A 2-tuple (x, y) of the top-left coordinates of the defined box.
        region_bottom_right: A 2-tuple (x, y) of the bottom-right coordinates of the defined box.

    Returns:
        True if inbox was found after scrolling, False otherwise.
    """
    # Calculate bottom-left from top_left and bottom_right
    region_bottom_left = (region_top_left[0], region_bottom_right[1])
    # --- Step I: Hover Mouse ---

    # Check for user activity in last 10 seconds
    if not user_was_active_recently(seconds=10):
        print("No user activity detected in last 10 seconds. Skipping inbox search.")
        return False

    # Announce the attempt
    print("User activity detected. Attempting to look for the inbox...")
    engine.say("Attempting to look for the inbox.")
    engine.runAndWait()
    engine.stop()

    # Calculate hover position: bottom-left with offset (x+10, y-10)
    hover_x = int(region_bottom_left[0]) + 10
    hover_y = int(region_bottom_left[1]) - 10

    # Move mouse to hover position
    pyautogui.moveTo(hover_x, hover_y)
    sleep(0.5)  # Brief pause after moving

    # Check if outlook_down_arrow.png exists within the user-defined region
    x1, y1 = int(region_top_left[0]), int(region_top_left[1])
    x2, y2 = int(region_bottom_right[0]), int(region_bottom_right[1])
    search_region = {"top": y1, "left": x1, "width": x2 - x1, "height": y2 - y1}

    if not image_exists_on_screen('images/outlook_down_arrow.png', region=search_region):
        print("outlook_down_arrow.png not found in defined region. Returning False.")
        return False

    print("outlook_down_arrow.png found. Proceeding to scroll and locate...")

    # --- Step II: Scroll and Locate ---

    # Scroll up 30 times
    print("Scrolling up 30 times...")
    for _ in range(30):
        pyautogui.scroll(3)  # Positive = scroll up
        sleep(0.05)  # Small delay between scrolls

    sleep(0.3)  # Pause after scrolling up

    # Scroll down 12 times
    print("Scrolling down 12 times...")
    for _ in range(12):
        pyautogui.scroll(-3)  # Negative = scroll down
        sleep(0.05)

    sleep(0.3)  # Pause after scrolling down

    # Check for inbox images on screen
    inbox_images = ['images/inbox.png', 'images/inbox_highlighted.png']
    for img_path in inbox_images:
        if image_exists_on_screen(img_path):
            print(f"Found {img_path} on screen. Inbox located successfully!")
            return True

    print("Inbox images not found after scrolling. Returning False.")
    return False


# This script:
# 1. Allows you to press Ctrl+~ to record the mouse position as the top-left corner of a box.
# 2. Press Ctrl+~ again to record the mouse position as the bottom-right corner of a box.
# 3. Every 10 seconds, it will analyze that region of the screen to count how many (255,0,0) blue pixels are present.
# 4. If the count of blue pixels increases compared to the previous measurement, it says You've Got Mail.

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

print("Press Ctrl+` once to set the top-left corner, then again to set the bottom-right corner.")

old_count = None
email_refresh_count = 0
refresh_warning_minutes_interval = 3 # increase to make the refresh warning less annoying

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
                email_alert()
            else:
                print("No increase in blue pixels.")
        if not inbox_button_exists(top_left, bottom_right):
            email_refresh_count += 1
            print("Inbox button not seen x", email_refresh_count)
            if email_refresh_count % (6 * refresh_warning_minutes_interval) == 0:
                # Attempt to automatically find the inbox
                print("Attempting to automatically find inbox...")
                if attempt_to_find_inbox(top_left, bottom_right):
                    print("Inbox found automatically!")
                    email_refresh_count = 0
                else:
                    # Auto-find failed, alert the user
                    email_alert(refresh_inbox_needed = True)
        else:
            email_refresh_count = 0
        old_count = new_count
        # Wait 10 seconds before next check
        sleep(10)
    else:
        # If corners not set yet, just wait and check again
        sleep(1)
