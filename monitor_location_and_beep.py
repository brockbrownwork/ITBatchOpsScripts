import keyboard
from pynput.mouse import Controller
from PIL import Image
import numpy as np
import time
import sys
import mss
from time import sleep

def capture_points():
    mouse = Controller()
    print("Move mouse to the top-left corner and press Ctrl+`")
    keyboard.wait('ctrl+`')
    point1 = mouse.position
    print(f"Top-left corner captured at {point1}")

    time.sleep(0.5)  # Prevent immediate second capture if key is held down

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

def images_are_similar(img1, img2, threshold=0.99):
    arr1 = np.array(img1)
    arr2 = np.array(img2)

    if arr1.shape != arr2.shape:
        return False

    similarity = np.mean(arr1 == arr2)
    print(f"Image similarity: {similarity * 100:.2f}%")
    return similarity >= threshold

def make_beep(short = False):
    try:
        import winsound
        if not short:
            winsound.Beep(330, 500)
        else:
            winsound.Beep(330, 100)
    except ImportError:
        # For Linux or MacOS, use 'os' module to make a beep
        print('\a')  # ASCII Bell

def monitor(rect, original_image):
    armed = True
    print("Monitoring started. Press Ctrl+C to exit.")
    try:
        with mss.mss() as sct:
            while True:
                sleep(10)
                image = sct.grab(rect)
                current_image = Image.frombytes('RGB', image.size, image.rgb)
                # Uncomment to save and view current images
                # current_image.save('current_image.png')
                # current_image.show()
                if not images_are_similar(original_image, current_image):
                    if armed:
                        print("Image changed! Beep!")
                        make_beep()
                        armed = False
                else:
                    if not armed:
                        print("Image restored. Armed again.")
                        make_beep(short = True)
                        armed = True
                time.sleep(1)
    except KeyboardInterrupt:
        print("Monitoring stopped.")
        sys.exit()

def main():
    point1, point2 = capture_points()
    rect = get_rectangle(point1, point2)
    print(f"Monitoring rectangle: {rect}")
    original_image = capture_original_image(rect)
    monitor(rect, original_image)

if __name__ == "__main__":
    main()
