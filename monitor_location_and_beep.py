import keyboard
from pynput.mouse import Controller
from PIL import Image
import numpy as np
import time
import sys
import mss
from time import sleep
from datetime import datetime
import pyttsx3

engine = pyttsx3.init()

def get_current_time():
    """Gets and formats the current time."""
    now = datetime.now()
    current_time = now.strftime("%I:%M:%S%p").lower()
    if current_time.startswith('0'):
        current_time = current_time[1:]
    return current_time

def capture_points():
    """Waits for user input to define the top-left and bottom-right corners of a rectangle."""
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
    """Calculates the rectangle dimensions from two points."""
    x1 = min(point1[0], point2[0])
    y1 = min(point1[1], point2[1])
    x2 = max(point1[0], point2[0])
    y2 = max(point1[1], point2[1])
    return {'left': int(x1), 'top': int(y1), 'width': int(x2 - x1), 'height': int(y2 - y1)}

def capture_original_image(rect):
    """Captures and saves the initial image of the defined area."""
    with mss.mss() as sct:
        image = sct.grab(rect)
        img = Image.frombytes('RGB', image.size, image.rgb)
        img.save('original_image.png')
        print("Original image captured and saved as 'original_image.png'.")
        return img

def images_are_similar(img1, img2, threshold=0.99):
    """Compares two images and returns True if they are similar enough."""
    arr1 = np.array(img1)
    arr2 = np.array(img2)

    if arr1.shape != arr2.shape:
        return False

    similarity = np.mean(arr1 == arr2)
    if similarity < 0.999:
        print(f"Image similarity: {similarity * 100:.2f}%")
    else:
        print(f"Watching... ({get_current_time()})")
    return similarity >= threshold

# --- NEW FUNCTION ---
def speak_alert(location_name):
    """Uses text-to-speech to announce the alert message three times."""
    
    # Determine the message based on user input
    message = location_name if location_name else "please check location"
    
    print(f"ALARM: Announcing '{message}'")
    
    # Say the message three times
    for _ in range(3):
        engine.say(message)
        engine.runAndWait()
        engine.stop()
        time.sleep(1) # A short pause between repetitions

def make_short_beep():
    """Produces a short beep sound for re-arming notification."""
    try:
        import winsound
        winsound.Beep(440, 150) # A short, higher-pitched beep
    except ImportError:
        print('\a')  # ASCII Bell for non-Windows systems


def monitor(rect, original_image, location_name):
    interval = 100
    try:
        interval = float(input("How often (in seconds) do you want to check? "))
    except Exception as e:
        pass

    """Main monitoring loop that checks for changes in the specified screen region."""
    armed = True
    with mss.mss() as sct:
        while True:
            time.sleep(interval)
            
            image = sct.grab(rect)
            current_image = Image.frombytes('RGB', image.size, image.rgb)

            if not images_are_similar(original_image, current_image):
                if armed:
                    print("Potential change detected. Verifying...")
                    time.sleep(interval)
                    
                    second_check_image_data = sct.grab(rect)
                    second_check_image = Image.frombytes('RGB', second_check_image_data.size, second_check_image_data.rgb)
                    
                    if not images_are_similar(original_image, second_check_image):
                        print("Change confirmed! Sounding alarm!")
                        # --- REPLACED BEEP WITH TTS ---
                        speak_alert(location_name)
                        armed = False # Disarm to prevent continuous alarms
                    else:
                        print("Change was temporary. Resuming monitoring.")
            else:
                if not armed:
                    print("Image restored. System is armed again.")
                    make_short_beep()
                    armed = True

# --- MODIFIED FUNCTION ---
def main():
    """Main function to run the program."""
    point1, point2 = capture_points()
    rect = get_rectangle(point1, point2)
    
    # --- ADDED: Prompt for a location name ---
    location_name = input("Enter the alert phrase for this location (or press Enter for default): ").strip()
    
    print(f"Monitoring rectangle: {rect}")
    original_image = capture_original_image(rect)
    original_image.show()
    while True:
        try:
            original_image = capture_original_image(rect)
            
            # --- MODIFIED: pass the location name to the monitor ---
            monitor(rect, original_image, location_name)
        except KeyboardInterrupt:
            print("Resetting monitoring using a new image!")

if __name__ == "__main__":
    main()