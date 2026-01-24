
import socketio
import time
import logging
import threading

# --- Configuration ---
SERVER_URL = "http://localhost:5001"
CLIENT_TYPE = "User"  # Represents a user interacting via the CLI
RECONNECT_DELAY = 5

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Socket.IO Client Setup ---
sio = socketio.Client(reconnection_delay=RECONNECT_DELAY, reconnection_attempts=10)
client_name = None

# --- Event to signal that input is needed ---
needs_input = threading.Event()
input_prompt = ""

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
    # Start the input loop in a separate thread once registered
    threading.Thread(target=input_loop, daemon=True).start()


@sio.on('message')
def on_message(data):
    logging.info(f"Received message from server: {data}")

@sio.on('command')
def on_command(data):
    action = data.get('action')
    payload = data.get('payload')
    logging.info(f"Received command: '{action}' with payload: {payload}")
    
    if action == "display_message":
        print(f"\n--- SERVER MESSAGE ---\n{payload.get('text', 'No text provided.')}\n----------------------")
    else:
        logging.warning(f"Unknown action received: {action}")

@sio.on('command_with_response')
def on_command_with_response(data):
    global input_prompt, needs_input
    action = data.get('action')
    payload = data.get('payload')
    logging.info(f"Received command with response request: '{action}' with payload: {payload}")

    if action == "get_user_input":
        prompt = payload.get('prompt', 'Please provide input: ')
        print(f"\n--- INPUT REQUESTED ---")
        # We cannot block the network thread with input(), so we signal the input thread.
        # This is a simplified example. A real implementation might use a queue.
        input_prompt = prompt
        needs_input.set() # We need to set the event here
        # This handler can't return the input directly because input() is blocking.
        # The input will be sent back to the server from the input_loop thread.
        # For this example, we'll return an acknowledgement.
        return {'status': 'acknowledged', 'message': 'Input prompt displayed to user.'}
    
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

def input_loop():
    """
    Runs in a background thread to handle user input without blocking the network connection.
    """
    while True:
        # Wait for the main thread to signal that input is needed
        if needs_input.wait(timeout=1): # Wait for 1 second then loop
            try:
                user_input = input(input_prompt)
                send_update("User provided input", {'input': user_input})
            except Exception as e:
                logging.error(f"Error reading input: {e}")
            finally:
                needs_input.clear() # Reset the event

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
    print("User Client Started. This client can receive messages and prompts.")
    print("It will also listen for command-line input when requested by the server.")
    start_client()
