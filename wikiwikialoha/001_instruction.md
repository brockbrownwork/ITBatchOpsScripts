# instruction_001.md
## Wikiwiki Aloha 2000

This is an **automation system** managed by a central **Python Flask server**.

It is a **state machine** that listens to messages sent to it by clients and sends commands back to those clients. These clients consist of Python scripts and JS (in-browser plugin) clients.

---

### System Requirements
* **Named Addressing:** Ability to send messages to clients by specific names.
    * *Target Names:* `runmyjobs`, `Atlassian Alerts`, `Solarwinds`, `Nagios`, `Outlook`, `Discord`, `TTS`, `User`.
* **Source Identification:** The server must identify which client a received message is coming from.
* **Dynamic Scaling:** If a duplicate client type connects, it should be auto-incremented with a number (e.g., `runmyjobs 2`).

---

### Workflow & Goals
Currently, the job involves monitoring alerts and emails throughout the day and responding with manual actions. At the end of the day, a PDF report is generated. The goal of this system is to **automate the majority of these tasks.**

---

### Client Architecture

| Client Type      | Assigned Services                               |
| :--------------- | :---------------------------------------------- |
| **JS (Browser)** | runmyjobs, Atlassian alerts, SolarWinds, Nagios |
| **Python**       | Outlook, Discord, TTS, User                     |

I would like you to first set up all of the files like in this format:
runmyjobs_client.js, outlook_client.py, and so on as blank templates set up to communicate with the Python server.

I'd like to be able to communicate with these in different ways:

Send a message and pause until a response is received, for example:

1. Server sends an action to "Atlassian alerts": "run job"
   Client performs the action (just put filler here for now, print statements)
2. Send a message and keep going
3. If you can come up with other types of interactions like this that might fill my needs better, let me know

See if you can come up with a system that works for my needs.

Thanks!