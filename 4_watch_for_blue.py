import keyboard
from pynput.mouse import Controller, Button
from PIL import Image
import numpy as np
import time
import sys
import mss
from time import sleep
from datetime import datetime
import pyttsx3

engine = pyttsx3.init()

def detect_user_activity(timeout_seconds=10):
    """
    Checks for mouse movement or keyboard activity over a specified time period.
    Checks once per second for the duration.

    Args:
        timeout_seconds: How long to wait for activity (default 10 seconds).

    Returns:
        True if mouse moved or key pressed, False otherwise.
    """
    mouse = Controller()
    initial_pos = mouse.position

    for _ in range(timeout_seconds):
        time.sleep(1)
        current_pos = mouse.position
        if current_pos != initial_pos:
            return True
        # Check if any key was pressed (simple approach using keyboard module)
        # We can't easily detect "any key pressed in last second" with keyboard module
        # So we'll just check mouse movement as the primary indicator
        initial_pos = current_pos  # Update position for next check

    return False

def hover_at_position(x, y):
    """
    Moves the mouse to the specified position.

    Args:
        x: The x coordinate.
        y: The y coordinate.
    """
    mouse = Controller()
    mouse.position = (x, y)

def scroll_mouse(scroll_count, direction='up'):
    """
    Scrolls the mouse wheel at the current position.

    Args:
        scroll_count: Number of scroll steps.
        direction: 'up' or 'down'.
    """
    mouse = Controller()
    scroll_direction = 1 if direction == 'up' else -1
    for _ in range(scroll_count):
        mouse.scroll(0, scroll_direction)
        time.sleep(0.1)

def image_exists_in_region(image_path, region_top_left, region_bottom_right):
    """
    Checks if a specific image exists within a screen region using exact pixel matching.

    Args:
        image_path: Path to the template image to find.
        region_top_left: A 2-tuple (x, y) of the top-left coordinates.
        region_bottom_right: A 2-tuple (x, y) of the bottom-right coordinates.

    Returns:
        True if the image is found, False otherwise.
    """
    x1, y1 = int(region_top_left[0]), int(region_top_left[1])
    x2, y2 = int(region_bottom_right[0]), int(region_bottom_right[1])

    width = x2 - x1
    height = y2 - y1

    if width <= 0 or height <= 0:
        return False

    search_region = {"top": y1, "left": x1, "width": width, "height": height}

    try:
        with mss.mss() as sct:
            sct_img = sct.grab(search_region)
            haystack_pil = Image.frombytes("RGB", (sct_img.width, sct_img.height), sct_img.rgb)
            haystack_arr = np.array(haystack_pil)
    except Exception as e:
        print(f"Error capturing screen region: {e}")
        return False

    try:
        needle_pil = Image.open(image_path)
        needle_pil = needle_pil.convert("RGB")
        needle_arr = np.array(needle_pil)

        if _find_exact_match(haystack_arr, needle_arr):
            return True
    except FileNotFoundError:
        print(f"Warning: Template image not found at {image_path}")
    except Exception as e:
        print(f"Error processing template image {image_path}: {e}")

    return False

# --- NEW HELPER FUNCTION ---
def _find_exact_match(haystack_arr, needle_arr, return_position=False):
    """
    Searches a larger numpy array (haystack) for an exact match of a
    smaller numpy array (needle).

    Args:
        haystack_arr: The numpy array of the screen region.
        needle_arr: The numpy array of the template image to find.
        return_position: If True, return the (x, y) position of the match.

    Returns:
        If return_position is False: True if an exact match is found, otherwise False.
        If return_position is True: (x, y, width, height) tuple if found, otherwise None.
    """
    H, W, _ = haystack_arr.shape
    h, w, _ = needle_arr.shape

    # Check if needle is larger than haystack
    if h > H or w > W:
        return None if return_position else False

    # Iterate through all possible top-left positions
    for y in range(H - h + 1):
        for x in range(W - w + 1):
            # Get the sub-region from the haystack
            sub_array = haystack_arr[y : y + h, x : x + w]

            # Perform an exact pixel-by-pixel comparison
            if np.array_equal(sub_array, needle_arr):
                if return_position:
                    return (x, y, w, h)
                return True

    # No match found after checking all positions
    return None if return_position else False


def _magic_wand_select(screen_arr, start_x, start_y, target_color):
    """
    Performs a magic wand (flood fill) selection on the screen starting from a point,
    selecting all connected pixels of the exact target color.

    Args:
        screen_arr: The numpy array of the full screen (RGB).
        start_x: The x coordinate to start the selection.
        start_y: The y coordinate to start the selection.
        target_color: The RGB tuple of the color to select.

    Returns:
        A set of (x, y) tuples representing all selected pixels.
    """
    H, W, _ = screen_arr.shape

    # Check if start position is valid
    if start_x < 0 or start_x >= W or start_y < 0 or start_y >= H:
        return set()

    # Check if the starting pixel matches the target color
    if tuple(screen_arr[start_y, start_x]) != target_color:
        return set()

    selected = set()
    to_check = [(start_x, start_y)]

    while to_check:
        x, y = to_check.pop()

        if (x, y) in selected:
            continue
        if x < 0 or x >= W or y < 0 or y >= H:
            continue
        if tuple(screen_arr[y, x]) != target_color:
            continue

        selected.add((x, y))

        # Add 4-connected neighbors
        to_check.append((x + 1, y))
        to_check.append((x - 1, y))
        to_check.append((x, y + 1))
        to_check.append((x, y - 1))

    return selected


def _get_selection_bounds(selected_pixels):
    """
    Gets the bounding rectangle of a set of selected pixels.

    Args:
        selected_pixels: A set of (x, y) tuples.

    Returns:
        A tuple (min_x, min_y, max_x, max_y) or None if empty.
    """
    if not selected_pixels:
        return None

    xs = [p[0] for p in selected_pixels]
    ys = [p[1] for p in selected_pixels]

    return (min(xs), min(ys), max(xs), max(ys))


def _check_for_unread_colors(screen_arr, bounds):
    """
    Checks if any unread message indicator colors exist within the given bounds.

    Args:
        screen_arr: The numpy array of the screen (RGB).
        bounds: A tuple (min_x, min_y, max_x, max_y).

    Returns:
        True if unread message colors are found, False otherwise.
    """
    if bounds is None:
        return False

    min_x, min_y, max_x, max_y = bounds

    # Extract the region
    region = screen_arr[min_y:max_y+1, min_x:max_x+1]

    # Unread message indicator colors
    unread_colors = [
        (0, 90, 176),
        (0, 90, 170),
        (46, 90, 158)
    ]

    for color in unread_colors:
        matches = np.sum(
            (region[:, :, 0] == color[0]) &
            (region[:, :, 1] == color[1]) &
            (region[:, :, 2] == color[2])
        )
        if matches > 0:
            return True

    return False

# Most common background colors for inbox images (for magic wand selection)
INBOX_BG_COLOR = (225, 225, 225)  # inbox.png background
INBOX_HIGHLIGHTED_BG_COLOR = (205, 230, 247)  # inbox_highlighted.png background


# --- MODIFIED FUNCTION ---
def inbox_button_exists(
    region_top_left,
    region_bottom_right,
):
    """
    Checks for the presence of either an un-highlighted or highlighted inbox image
    within a specified region of the screen using exact pixel matching.
    When found, performs a magic wand selection from the center of the found image
    on the full screen and checks for unread message indicator colors.

    Args:
        region_top_left: A 2-tuple (x, y) of the top-left coordinates of the search area.
        region_bottom_right: A 2-tuple (x, y) of the bottom-right coordinates of the search area.

    Returns:
        A tuple (found, has_unread):
            - found: True if inbox image is found, False otherwise.
            - has_unread: True if unread message colors detected in selection, False otherwise.
    """

    # 1. Define the screen region to capture
    x1, y1 = int(region_top_left[0]), int(region_top_left[1])
    x2, y2 = int(region_bottom_right[0]), int(region_bottom_right[1])

    width = x2 - x1
    height = y2 - y1

    if width <= 0 or height <= 0:
        print("Invalid search region. Make sure bottom-right is after top-left.")
        return (False, False)

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
        return (False, False)  # Cannot proceed if screen grab fails

    # 3. Define the "needles" (the template images) with their background colors
    image_configs = [
        ('images/inbox.png', INBOX_BG_COLOR),
        ('images/inbox_highlighted.png', INBOX_HIGHLIGHTED_BG_COLOR)
    ]

    # 4. Loop through each needle and search for it
    for path, bg_color in image_configs:
        try:
            # Load needle image
            needle_pil = Image.open(path)
            # Convert to RGB to ensure it matches the haystack format (discarding alpha)
            needle_pil = needle_pil.convert("RGB")
            # Convert to numpy array
            needle_arr = np.array(needle_pil)

            # Use the helper function to find an exact match and get position
            match_result = _find_exact_match(haystack_arr, needle_arr, return_position=True)

            if match_result is not None:
                match_x, match_y, match_w, match_h = match_result
                print(f"Inbox found at region-relative position ({match_x}, {match_y})")

                # Calculate the center of the found image in screen coordinates
                center_screen_x = x1 + match_x + match_w // 2
                center_screen_y = y1 + match_y + match_h // 2

                # 5. Capture the full screen for magic wand selection
                try:
                    with mss.mss() as sct:
                        monitor = sct.monitors[1]  # Primary monitor
                        full_screen_img = sct.grab(monitor)
                        full_screen_pil = Image.frombytes(
                            "RGB",
                            (full_screen_img.width, full_screen_img.height),
                            full_screen_img.rgb
                        )
                        full_screen_arr = np.array(full_screen_pil)
                except Exception as e:
                    print(f"Error capturing full screen: {e}")
                    return (True, False)

                # 6. Perform magic wand selection from the center using the background color
                print(f"Performing magic wand selection at ({center_screen_x}, {center_screen_y}) with color {bg_color}")
                selected_pixels = _magic_wand_select(
                    full_screen_arr,
                    center_screen_x,
                    center_screen_y,
                    bg_color
                )

                if not selected_pixels:
                    print("Magic wand selection returned no pixels")
                    return (True, False)

                print(f"Magic wand selected {len(selected_pixels)} pixels")

                # 7. Get the bounding rectangle of the selection
                bounds = _get_selection_bounds(selected_pixels)
                if bounds:
                    print(f"Selection bounds: {bounds}")

                # 8. Check for unread message colors within the bounds
                has_unread = _check_for_unread_colors(full_screen_arr, bounds)
                if has_unread:
                    print("Unread message indicator colors detected!")
                else:
                    print("No unread message indicators found in selection")

                return (True, has_unread)

        except FileNotFoundError:
            print(f"Warning: Template image not found at {path}")
            pass  # Try the next image
        except Exception as e:
            print(f"Error processing template image {path}: {e}")
            pass  # Try the next image

    # --- 5. Neither image was found ---
    return (False, False)

def attempt_to_find_inbox(region_top_left, region_bottom_right):
    """
    Attempts to find and navigate to the inbox.

    Steps:
    I. Wait for user activity (mouse movement) for 10 seconds. If no activity, return False.
    II. Hover mouse over bottom-left of the box (with x+10, y-10 offset).
    III. Check if outlook_down_arrow.png exists in region. If not, return False.
    IV. Scroll up 30, then scroll down 12.
    V. Check if inbox.png or inbox_highlighted.png exists. Return True if found, else False.

    Args:
        region_top_left: A 2-tuple (x, y) of the top-left coordinates.
        region_bottom_right: A 2-tuple (x, y) of the bottom-right coordinates.

    Returns:
        True if inbox was found, False otherwise.
    """
    # I. Wait and check for user inactivity
    print("Checking if user is idle before attempting to find inbox...")

    if detect_user_activity(timeout_seconds=10):
        # User is active, don't interrupt them
        print("User activity detected. Aborting inbox search.")
        return False

    # Check if Outlook is visible anywhere on screen before proceeding
    with mss.mss() as sct:
        monitor = sct.monitors[1]  # Primary monitor
        screen_top_left = (monitor["left"], monitor["top"])
        screen_bottom_right = (monitor["left"] + monitor["width"], monitor["top"] + monitor["height"])
    if not image_exists_in_region('images/outlook_logo.png', screen_top_left, screen_bottom_right):
        print("Outlook logo not found on screen. Aborting inbox search.")
        return False

    # User is idle, announce and proceed
    engine.say("Attempting to look for the inbox.")
    engine.runAndWait()
    engine.stop()

    # II. Hover mouse over bottom-left of the box (except in toward the middle a little bit)
    # Bottom-left means: x from top_left, y from bottom_right
    hover_x = int(region_top_left[0]) + 30
    hover_y = int(region_bottom_right[1]) - 30
    hover_at_position(hover_x, hover_y)
    print(f"Hovering at position ({hover_x}, {hover_y})")
    time.sleep(0.5)  # Brief pause to let any UI respond

    # III. Check if outlook_down_arrow.png exists in region
    if not image_exists_in_region('images/outlook_down_arrow.png', region_top_left, region_bottom_right):
        print("Outlook down arrow not found in region.")
        return False
    print("Outlook down arrow found. Proceeding with scroll...")
    # Nudge mouse by 1 pixel to ensure UI registers the hover
    hover_at_position(hover_x + 1, hover_y)
    time.sleep(0.1)

    # IV. Scroll up 30, then scroll down 14
    scroll_mouse(30, direction='up')
    time.sleep(0.5)
    scroll_mouse(14, direction='down')
    time.sleep(0.5)

    # V. Check if inbox.png or inbox_highlighted.png exists
    found, has_unread = inbox_button_exists(region_top_left, region_bottom_right)
    if found:
        print("Inbox found after scrolling!")
        if has_unread:
            engine.say("Found it. You have unread messages.")
        else:
            engine.say("Found it.")
        engine.runAndWait()
        engine.stop()
        return True

    print("Inbox not found after scrolling.")
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
refresh_warning_minutes_interval = 5 # increase to make the refresh warning less annoying

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
        inbox_found, has_unread = inbox_button_exists(top_left, bottom_right)
        if not inbox_found:
            email_refresh_count += 1
            print("Inbox button not seen x", email_refresh_count)
            if email_refresh_count % (6 * refresh_warning_minutes_interval) == 0:
                # Attempt to find inbox before alerting
                if attempt_to_find_inbox(top_left, bottom_right):
                    email_refresh_count = 0  # Reset counter if inbox was found
                else:
                    email_alert(refresh_inbox_needed = True)
        else:
            email_refresh_count = 0
            if has_unread:
                print("Unread messages detected via magic wand selection!")
        old_count = new_count
        # Wait 10 seconds before next check
        sleep(10)
    else:
        # If corners not set yet, just wait and check again
        sleep(1)