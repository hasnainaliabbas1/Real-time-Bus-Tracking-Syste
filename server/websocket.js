import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { parse } from 'url';

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, request) => {
    console.log('New WebSocket connection');

    // Send initial connection success message
    ws.send(JSON.stringify({ type: 'connection', status: 'connected' }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received:', data);

        // Handle authentication
        if (data.type === 'auth') {
          console.log('Authenticated user:', data.userId);
          ws.send(JSON.stringify({ 
            type: 'auth_success',
            userId: data.userId,
            role: data.role
          }));
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Failed to process message' 
        }));
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  server.on('upgrade', (request, socket, head) => {
    try {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } catch (error) {
      console.error('Upgrade error:', error);
      socket.destroy();
    }
  });

  return wss;
} 