import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import type { WsEvent } from '@ea-workbench/shared-schema';

const clients = new Set<WebSocket>();

export function setupWebSocket(app: FastifyInstance): void {
  app.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket);

    socket.on('close', () => {
      clients.delete(socket);
    });

    socket.on('error', () => {
      clients.delete(socket);
    });

    // Send initial heartbeat
    const heartbeat: WsEvent = {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
    };
    socket.send(JSON.stringify(heartbeat));
  });

  // Periodic heartbeat
  const interval = setInterval(() => {
    const heartbeat: WsEvent = {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
    };
    broadcast(heartbeat);
  }, 30_000);

  app.addHook('onClose', () => {
    clearInterval(interval);
    for (const client of clients) {
      client.close();
    }
    clients.clear();
  });
}

export function broadcast(event: WsEvent): void {
  const message = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}
