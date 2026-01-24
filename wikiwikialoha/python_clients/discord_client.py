
import socketio
import time
import logging

# --- Configuration ---
SERVER_URL = "http://localhost:5001"
CLIENT_TYPE = "Discord"  # This name must match one of the expected client types on the server
RECONNECT_DELAY = 5  # Seconds to wait before attempting to reconnect

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Socket.IO Client Setup ---
sio = socketio.Client(reconnection_delay=RECONNECT_DELAY, reconnection_attempts=10)
client_name = None  # Will be set by the server upon registration

@sio.event
def connect():
    """
    Called when a connection to the server is established.
    Identifies the client to the server.
    """
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
    """
    Called by the server to confirm registration.
    Stores the unique name assigned by the server.
    """
    global client_name
    client_name = data.get('client_name')
    logging.info(f"Successfully registered with server as '{client_name}'.")

@sio.on('message')
def on_message(data):
    """
    Generic message handler from the server.
    """
    logging.info(f"Received message from server: {data}")

@sio.on('command')
def on_command(data):
    """
    Handles 'fire-and-forget' commands from the server.
    """
    action = data.get('action')
    payload = data.get('payload')
    logging.info(f"Received command: '{action}' with payload: {payload}")
    
    # --- Action Handler ---
    if action == "send_message":
        print(f"ACTION: Sending message to Discord: {payload.get('message')}")
        sio.sleep(1)
        send_update("Message sent.")
    else:
        logging.warning(f"Unknown action received: {action}")

@sio.on('command_with_response')
def on_command_with_response(data):
    """
    Handles commands that require a direct response.
    """
    action = data.get('action')
    payload = data.get('payload')
    logging.info(f"Received command with response request: '{action}' with payload: {payload}")

    # --- Action and Response Logic ---
    if action == "get_status":
        print("ACTION: Getting status...")
        return {'status': 'connected', 'server': '#general'}
    
    return {'status': 'error', 'message': f'Unknown action: {action}'}

def send_update(message, payload=None):
    """
    Proactively sends an update from the client to the server.
    """
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
    """
    Starts the client and attempts to connect to the server.
    """
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
