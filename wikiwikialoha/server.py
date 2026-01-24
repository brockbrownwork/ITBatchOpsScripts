
from flask import Flask, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins for simplicity in development
socketio = SocketIO(app, cors_allowed_origins="*")

# In-memory store for connected clients
# Format: { 'client_name_1': 'session_id_1', 'client_name_2': 'session_id_2' }
clients = {}
client_counts = {}

@socketio.on('connect')
def handle_connect():
    """
    Handles a new client connection.
    The client is expected to send an 'identify' event immediately after connecting.
    """
    logging.info(f"Client connected with session ID: {request.sid}")
    emit('message', {'data': 'Welcome! Please identify yourself.'})

@socketio.on('disconnect')
def handle_disconnect():
    """
    Handles a client disconnection.
    Removes the client from the registry.
    """
    disconnected_client_name = None
    for name, sid in clients.items():
        if sid == request.sid:
            disconnected_client_name = name
            break
    
    if disconnected_client_name:
        del clients[disconnected_client_name]
        logging.info(f"Client '{disconnected_client_name}' disconnected.")
        # Note: client_counts is not decremented to ensure unique names over the server's lifetime.
        # This can be changed if names should be reused.
    else:
        logging.warning(f"A client with session ID {request.sid} disconnected without being identified.")

@socketio.on('identify')
def handle_identify(data):
    """
    Registers a client with a unique name.
    Handles dynamic scaling by appending a number to duplicate client types.
    
    :param data: JSON object with a 'client_type' key. e.g., {'client_type': 'runmyjobs'}
    """
    client_type = data.get('client_type')
    if not client_type:
        logging.error(f"Identify event from {request.sid} missing 'client_type'.")
        return

    # Handle dynamic scaling for duplicate client types
    count = client_counts.get(client_type, 0) + 1
    client_counts[client_type] = count
    
    client_name = f"{client_type} {count}" if count > 1 else client_type

    # Store the client
    clients[client_name] = request.sid
    logging.info(f"Client identified as '{client_name}' with session ID {request.sid}")
    
    # Confirm registration with the client
    emit('registered', {'client_name': client_name, 'session_id': request.sid})

@socketio.on('message_from_client')
def handle_client_message(data):
    """
    Listens for messages from clients and logs them.
    This can be expanded to route messages or trigger server-side actions.
    
    :param data: JSON object from the client. Expected to include 'source' and 'payload'.
    """
    source = data.get('source', 'Unknown Client')
    payload = data.get('payload', {})
    logging.info(f"Received message from '{source}': {payload}")
    
    # Example of echoing the message back to the sender
    emit('message', {'source': 'server', 'payload': f"Acknowledged your message: {payload}"})

# --- Communication Patterns ---

def send_message_to_client(client_name, event, data):
    """
    Sends a message to a specific client by name.
    """
    sid = clients.get(client_name)
    if sid:
        socketio.emit(event, data, room=sid)
        logging.info(f"Sent '{event}' to '{client_name}': {data}")
        return True
    else:
        logging.warning(f"Could not send message: Client '{client_name}' not found.")
        return False

# 1. Fire and Forget
def fire_and_forget(client_name, action, payload=None):
    """
    Sends a command to a client and does not wait for a response.
    """
    data = {'action': action, 'payload': payload or {}}
    send_message_to_client(client_name, 'command', data)

# 2. Request and Response (with callback)
def request_with_callback(client_name, action, payload=None, timeout=10):
    """
    Sends a command and waits for a direct response from the client.
    This uses SocketIO's callback mechanism.
    """
    sid = clients.get(client_name)
    if not sid:
        logging.warning(f"Could not send request: Client '{client_name}' not found.")
        return None

    data = {'action': action, 'payload': payload or {}}
    
    try:
        response = socketio.call('command_with_response', data, to=sid, timeout=timeout)
        logging.info(f"Received response from '{client_name}': {response}")
        return response
    except Exception as e:
        logging.error(f"Timeout or error waiting for response from '{client_name}': {e}")
        return None

# --- Example Usage (can be triggered from another thread or an API endpoint) ---

@app.route('/test/fire-forget/<client_name>/<action>')
def test_fire_forget(client_name, action):
    """Example HTTP endpoint to test fire-and-forget."""
    fire_and_forget(client_name, action, {'message': 'This is a test.'})
    return f"Sent fire-and-forget '{action}' to '{client_name}'."

@app.route('/test/request-response/<client_name>/<action>')
def test_request_response(client_name, action):
    """Example HTTP endpoint to test request-response."""
    response = request_with_callback(client_name, action, {'question': 'What is your status?'})
    if response:
        return f"Response from '{client_name}': {response}"
    else:
        return f"No response from '{client_name}'.", 408


if __name__ == '__main__':
    logging.info("Starting Wikiwiki Aloha 2000 Server...")
    socketio.run(app, debug=True, port=5001)

