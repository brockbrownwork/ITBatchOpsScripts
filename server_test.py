from flask import Flask, request
from flask_cors import CORS

app = Flask(__name__)
# Enable CORS for all routes, allowing your web page to communicate with the server.
CORS(app) 

@app.route('/message', methods=['POST'])
def receive_message():
    message = request.data.decode('utf-8')
    print(f"Received message from client: {message}")
    return "Message received successfully!"

if __name__ == '__main__':
    app.run(port=5000)
