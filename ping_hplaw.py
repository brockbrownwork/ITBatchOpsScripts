import subprocess
import time
import platform
import tkinter as tk
from tkinter import messagebox

def is_host_reachable(host: str) -> bool:
    """
    Returns True if host is reachable by ping; otherwise False.
    Adjust the ping command depending on OS.
    """
    # Determine which ping command to use based on current OS
    system_os = platform.system().lower()
    if 'windows' in system_os:
        ping_command = ['ping', '-n', '1', host]
    else:
        ping_command = ['ping', '-c', '1', host]

    try:
        result = subprocess.run(
            ping_command,
            stdout=subprocess.DEVNULL,  # discard output
            stderr=subprocess.DEVNULL,  # discard errors
            timeout=3
        )
        return result.returncode == 0  # 0 means successful ping
    except subprocess.TimeoutExpired:
        return False

def alert_pop_up(title: str, message: str):
    """
    Displays a Tkinter pop-up window with the specified title and message.
    """
    root = tk.Tk()
    root.withdraw()  # Hide the main window
    messagebox.showinfo(title, message)
    root.destroy()

def monitor_host(host: str, ping_interval: float = 5.0):
    """
    Continuously monitors the specified host by pinging it:
    1) Waits until it goes down (if it isn’t already).
    2) Once it’s down, waits for it to come back up.
    3) When it’s up again, displays a pop-up notification.
    4) Repeats indefinitely.
    """
    print(f"Starting to monitor {host}...")
    host_is_down = False

    while True:
        reachable = is_host_reachable(host)

        if not host_is_down:
            # If previously up and now down, switch state
            if not reachable:
                print(f"{host} is down!")
                host_is_down = True
        else:
            # If previously down and now up, alert user
            if reachable:
                print(f"{host} is back up!")
                alert_pop_up(f"{host} is back up!", f"{host} has come back online.")
                host_is_down = False

        time.sleep(ping_interval)

if __name__ == "__main__":
    monitor_host("HPLAW", ping_interval=5)
