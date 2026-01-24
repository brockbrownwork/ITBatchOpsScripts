
import socketio
import time
import logging

# --- Configuration ---
SERVER_URL = "http://localhost:5001"
CLIENT_TYPE = "TTS"  # Text-to-Speech
RECONNECT_DELAY = 5

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Socket.IO Client Setup ---
sio = socketio.Client(reconnection_delay=RECONNECT_DELAY, reconnection_attempts=10)
client_name = None

@sio.event
def connect():
    logging.info(f"Connected to server. Sending identification as '{CLIENT_TYPE}'.")
    sio.emit('identify', {'client_type': CLIENT_TYPE})

@sio.event
def connect_error(data):
    logging.error(f"Connection failed: {data}")

@sio.event
def disconnect():
    logging.warning("Disconnected from server. Will attempt to reconnect.")

@sio.event
def registered(data):
    global client_name
    client_name = data.get('client_name')
    logging.info(f"Successfully registered with server as '{client_name}'.")

@sio.on('message')
def on_message(data):
    logging.info(f"Received message from server: {data}")

@sio.on('command')
def on_command(data):
    action = data.get('action')
    payload = data.get('payload')
    logging.info(f"Received command: '{action}' with payload: {payload}")
    
    if action == "speak":
        text = payload.get('text', 'No text provided.')
        print(f"ACTION: Speaking text: '{text}'")
        # In a real scenario, you would use a TTS library like gTTS or pyttsx3
        sio.sleep(2) # Simulate time taken to speak
        send_update(f"Finished speaking.")
    else:
        logging.warning(f"Unknown action received: {action}")

@sio.on('command_with_response')
def on_command_with_response(data):
    action = data.get('action')
    payload = data.get('payload')
    logging.info(f"Received command with response request: '{action}' with payload: {payload}")

    if action == "get_status":
        print("ACTION: Getting status...")
        # This could report available voices, language, etc.
        return {'status': 'ready', 'voice': 'default'}
    
    return {'status': 'error', 'message': f'Unknown action: {action}'}

def send_update(message, payload=None):
    if not client_name:
        logging.warning("Cannot send update: client is not yet registered.")
        return
    
    logging.info(f"Sending update to server: {message}")
    sio.emit('message_from_client', {
        'source': client_name,
        'payload': {
            'message': message,
            'data': payload or {}
        }
    })

def start_client():
    while True:
        try:
            logging.info(f"Attempting to connect to {SERVER_URL}...")
            sio.connect(SERVER_URL, transports=['websocket'])
            sio.wait()
        except socketio.exceptions.ConnectionError as e:
            logging.error(f"Failed to connect to server: {e}. Retrying in {RECONNECT_DELAY}s...")
            time.sleep(RECONNECT_DELAY)
        except Exception as e:
            logging.critical(f"An unexpected error occurred: {e}. Retrying in {RECONNECT_DELAY}s...")
            sio.disconnect()
            time.sleep(RECONNECT_DELAY)

if __name__ == '__main__':
    start_client()
