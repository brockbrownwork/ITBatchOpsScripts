import pyautogui
import time

def safe_locate(image_path):
    try:
        pyautogui.moveTo(1, 1)  # Move mouse to origin before detecting
        return pyautogui.locateCenterOnScreen(image_path)
    except Exception as e:
        print(f"Error locating {image_path}: {e}")
        return None

def main_loop():
    while True:
        last_position = pyautogui.position()
        print("Waiting 10 seconds before starting check...")
        time.sleep(10)
        if pyautogui.position() != last_position: # prevent iteration from executing if mouse has moved
            last_position = pyautogui.position()
            continue
        try:
            print("Checking for rman_1.png...")
            rman_1 = safe_locate("images/rman_1.png")
            if not rman_1:
                print("rman_1 not found. Skipping this cycle.")
                continue
            pyautogui.rightClick(rman_1)
            time.sleep(1)

            print("Checking for close_1.png...")
            close_1 = safe_locate("images/close_1.png")
            if not close_1:
                print("close_1 not found. Skipping this cycle.")
                continue
            pyautogui.click(close_1)
            time.sleep(1)

            print("Checking for rman_2.png...")
            rman_2 = safe_locate("images/rman_2.png")
            if not rman_2:
                print("rman_2 not found. Skipping this cycle.")
                continue

            print("Checking for ok.png...")
            ok = safe_locate("images/ok.png")
            if not ok:
                print("ok not found. Skipping this cycle.")
                continue
            pyautogui.click(ok)
            time.sleep(1)

            print("Cycle complete. Waiting 30 seconds before next run.")
            time.sleep(30)

        except Exception as e:
            print(f"Unexpected error during loop: {e}")
            continue  # Continue to the next loop iteration even on unexpected errors

if __name__ == "__main__":
    main_loop()
