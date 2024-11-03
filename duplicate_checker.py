import tkinter as tk
from tkinter import messagebox
import pyperclip

def check_duplicates():
    # Get clipboard content
    clipboard_content = pyperclip.paste()
    
    # Split by newline and strip any surrounding whitespace
    items = [item.strip() for item in clipboard_content.split('\n') if item.strip()]
    
    # Find duplicates
    duplicates = [item for item in set(items) if items.count(item) > 1]
    
    if duplicates:
        result = "Duplicates found:\n" + "\n".join(duplicates)
    else:
        result = "No duplicates found."
    
    # Display result in a message box
    messagebox.showinfo("Result", result)

# Create the main window
root = tk.Tk()
root.title("Duplicate Finder")

# Create a button that checks for duplicates when clicked
check_button = tk.Button(root, text="Check Clipboard for Duplicates", command=check_duplicates)
check_button.pack(pady=20)

# Run the application
root.mainloop()
