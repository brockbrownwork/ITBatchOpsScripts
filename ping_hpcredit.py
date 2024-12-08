import subprocess
import sys
import time
import platform
import tkinter as tk
from tkinter import messagebox

def can_ping(host):
    # Determine which parameter to use based on the OS
    count_param = '-n' if platform.system().lower() == 'windows' else '-c'
    command = ["ping", count_param, "1", host]
    # On success, ping returns 0; on failure, non-zero.
    return subprocess.call(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0

def alert_user(host):
    # Create a simple popup window with tkinter
    root = tk.Tk()
    root.withdraw()  # Hide the main window
    # Bring the messagebox to the front
    root.attributes("-topmost", True)
    messagebox.showinfo("Host Responded", f"{host} is responding again!")
    root.destroy()

if __name__ == "__main__":
    host = "hpcredit"

    print(f"Checking connectivity to {host}...")
    # Loop until we get a successful ping
    while True:
        if can_ping(host):
            print(f"{host} is responding! Showing popup...")
            alert_user(host)
            break
        else:
            print(f"{host} is still not responding, will check again soon...")
        time.sleep(5)  # Wait a few seconds before trying again
