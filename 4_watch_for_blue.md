# Attempt to Find Inbox (Function)

**Note about I:** bottom left of box defined originally with "ctrl + ~"

---

### I. Hover Mouse

If user mouse movement or keystrokes is not detected after 10 seconds of waiting (keep the detection simple, i.e.: just check every second for 10 seconds if the mouse has moved), then announce you're going to attempt to look for the inbox. Else, return False.

Hover mouse over the **bottom left** (add x+10 and y-10). 
* **If** `images/outlook_down_arrow.png` exists in box, **go to II**. 
* **Else**, return `False`.

### II. Scroll and Locate
**Scroll up 30 scrolls**, then **scroll down 12**. 
* **If** `inbox.png` or `inbox_highlighted.png` are in box, **then return `True`**. 
* **Else**, return `False`.