/**
 * Socket service for handling WebSocket connections
 */

// Get the WebSocket URL from environment variables or use default
const WS_URL = 'wss://cserver.caleblamoreaux.com/ws';

/**
 * Connect to the WebSocket server
 * @param {Object} handlers - Event handlers for the socket
 * @param {Function} handlers.onOpen - Called when socket connection opens
 * @param {Function} handlers.onClose - Called when socket connection closes
 * @param {Function} handlers.onMessage - Called when a message is received
 * @param {Function} handlers.onError - Called when a socket error occurs
 * @returns {WebSocket} - The WebSocket instance
 */
export function connectSocket({ onOpen, onClose, onMessage, onError }) {
  try {
    const socket = new WebSocket(WS_URL);
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
      if (onOpen) onOpen();
    };
    
    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      if (onClose) onClose(event);
      
      // Attempt to reconnect after a delay if not closed intentionally
      if (event.code !== 1000) {
        console.log('Attempting to reconnect in 5 seconds...');
        setTimeout(() => {
          connectSocket({ onOpen, onClose, onMessage, onError });
        }, 5000);
      }
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) onError(error);
    };
    
    return socket;
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
    if (onError) onError(error);
    return null;
  }
}

/**
 * Send a message to the WebSocket server
 * @param {WebSocket} socket - The WebSocket instance
 * @param {Object} data - The data to send
 * @returns {boolean} - True if the message was sent, false otherwise
 */
export function sendMessage(socket, data) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('Socket is not open');
    return false;
  }
  
  try {
    socket.send(JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
}