# Attempt to Find Inbox (Function)

**Note about I:** bottom left of box defined originally with "ctrl + ~"

---

### I. Hover Mouse

If user mouse movement or keystrokes are detected after 10 seconds of waiting, then announce you're going to attempt to look for the inbox. Else, return False.

Hover mouse over the **bottom left** (add x+10 and y-10). 
* **If** `images/outlook_down_arrow.png` exists on screen, **go to II**. 
* **Else**, return `False`.

### II. Scroll and Locate
**Scroll up 30 scrolls**, then **scroll down 12**. 
* **If** `inbox.png` or `inbox_highlighted.png` are on screen, **then return `True`**. 
* **Else**, return `False`.