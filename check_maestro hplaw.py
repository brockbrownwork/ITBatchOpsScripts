import pyperclip

# Required terms to check in clipboard content
required_terms = [
    "listener",
    "pay",
    "cash",
    "ap",
    "gl",
]

def main():
    try:
        # Get clipboard content
        clipboard_content = pyperclip.paste()
        
        # Convert clipboard content to lowercase
        clipboard_content_lower = clipboard_content.lower()

        # Check if all required terms are in the clipboard content
        missing_terms = [term for term in required_terms if term not in clipboard_content_lower]

        # Report results
        if not missing_terms:
            print("All required terms are present in the clipboard content.")
        else:
            print("The following required terms are missing from the clipboard content:")
            print("\n".join(missing_terms))

        # Update the clipboard with the lowercased content
        pyperclip.copy(clipboard_content_lower)
        print("Clipboard content has been converted to lowercase.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
    input("Press enter to continue...")
