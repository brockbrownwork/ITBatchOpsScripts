import keyboard
from pynput.mouse import Controller
from PIL import Image
import numpy as np
import time
import sys
import mss
from time import sleep
from datetime import datetime

def get_current_time():
    now = datetime.now()
    current_time = now.strftime("%I:%M:%S%p").lower()
    if current_time.startswith('0'):
        current_time = current_time[1:]
    return current_time

def capture_points():
    mouse = Controller()
    print("Move mouse to the top-left corner and press Ctrl+`")
    keyboard.wait('ctrl+`')
    point1 = mouse.position
    print(f"Top-left corner captured at {point1}")

    time.sleep(0.5)

    print("Move mouse to the bottom-right corner and press Ctrl+`")
    keyboard.wait('ctrl+`')
    point2 = mouse.position
    print(f"Bottom-right corner captured at {point2}")

    return point1, point2

def get_rectangle(point1, point2):
    x1 = min(point1[0], point2[0])
    y1 = min(point1[1], point2[1])
    x2 = max(point1[0], point2[0])
    y2 = max(point1[1], point2[1])
    return {'left': int(x1), 'top': int(y1), 'width': int(x2 - x1), 'height': int(y2 - y1)}

def capture_original_image(rect):
    with mss.mss() as sct:
        image = sct.grab(rect)
        img = Image.frombytes('RGB', image.size, image.rgb)
        img.save('original_image.png')
        img.show(title='Original Image')
        print("Original image captured and saved as 'original_image.png'.")
        return img

def count_red_pixels(img, r_threshold=255, diff_threshold=20):
    """
    Consider a pixel 'red' if:
    R > r_threshold and R > G + diff_threshold and R > B + diff_threshold
    """
    arr = np.array(img)
    R, G, B = arr[:,:,0], arr[:,:,1], arr[:,:,2]

    red_mask = (R > r_threshold) & (R > G + diff_threshold) & (R > B + diff_threshold)
    return np.sum(red_mask)

def make_beep(short=False):
    try:
        import winsound
        if not short:
            winsound.Beep(330, 500)
            sleep(0.5)
            winsound.Beep(330, 500)
        else:
            winsound.Beep(330, 100)
            sleep(0.5)
            winsound.Beep(330, 100)
    except ImportError:
        print('\a')

def monitor(rect, original_image, tolerance=1):
    original_red_count = count_red_pixels(original_image)
    print(f"Original red pixels count: {original_red_count}")
    armed = True
    print("Monitoring started. Press Ctrl+C to exit.")

    try:
        with mss.mss() as sct:
            while True:
                sleep(10)
                image = sct.grab(rect)
                current_image = Image.frombytes('RGB', image.size, image.rgb)

                current_red_count = count_red_pixels(current_image)
                print(f"Current red pixels: {current_red_count} ({get_current_time()})")

                # Trigger if even a small increase above the original count is detected
                if current_red_count > original_red_count + tolerance:
                    if armed:
                        print("Red pixel count increased! Beep!")
                        make_beep()
                        armed = False
                else:
                    if not armed:
                        print("Red pixel count returned to normal. Armed again.")
                        make_beep(short=True)
                        armed = True

                time.sleep(1)
    except KeyboardInterrupt:
        print("Monitoring stopped.")
        sys.exit()

def main():
    make_beep()
    point1, point2 = capture_points()
    rect = get_rectangle(point1, point2)
    print(f"Monitoring rectangle: {rect}")
    original_image = capture_original_image(rect)
    # Tolerance is set very low now
    monitor(rect, original_image, tolerance=1)

if __name__ == "__main__":
    main()
