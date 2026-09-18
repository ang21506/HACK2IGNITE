import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Helper to get local IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

import fs from 'fs';

const distPath = path.join(__dirname, 'dist');
const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(distPath);

if (isProduction) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.headers.upgrade === 'websocket') return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log('[Server] Running in PRODUCTION mode (Serving dist/)');
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
  console.log('[Server] Running in DEVELOPMENT mode (Vite Middleware)');
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map(); // roomCode -> Room Object

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

wss.on('connection', (ws) => {
  let currentRoom = null;
  let playerRole = null; // 'p1' (Host) or 'p2' (Client)

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'CREATE_ROOM': {
          let code = generateRoomCode();
          while (rooms.has(code)) {
            code = generateRoomCode();
          }
          currentRoom = {
            code,
            host: ws,
            client: null,
            levelIndex: data.levelIndex || 0,
            gameState: 'LOBBY',
            objects: {}
          };
          rooms.set(code, currentRoom);
          playerRole = 'p1';

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            roomCode: code,
            playerRole: 'p1',
            localIp: getLocalIp(),
            port: PORT
          }));
          console.log(`Room created: ${code} by Host`);
          break;
        }

        case 'JOIN_ROOM': {
          const targetCode = (data.roomCode || '').toUpperCase().trim();
          const room = rooms.get(targetCode);

          if (!room) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Room code not found!' }));
            return;
          }

          if (room.client && room.client.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full (2/2 players)!' }));
            return;
          }

          room.client = ws;
          currentRoom = room;
          playerRole = 'p2';

          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            roomCode: targetCode,
            playerRole: 'p2',
            levelIndex: room.levelIndex
          }));

          // Notify Host that P2 connected
          if (room.host && room.host.readyState === WebSocket.OPEN) {
            room.host.send(JSON.stringify({
              type: 'PLAYER_JOINED',
              playerRole: 'p2'
            }));
          }
          console.log(`Player 2 joined room: ${targetCode}`);
          break;
        }

        case 'START_GAME': {
          if (currentRoom && playerRole === 'p1') {
            currentRoom.gameState = 'PLAYING';
            const payload = JSON.stringify({
              type: 'GAME_STARTED',
              levelIndex: data.levelIndex || 0
            });
            currentRoom.host?.send(payload);
            currentRoom.client?.send(payload);
            console.log(`Game started in room ${currentRoom.code}`);
          }
          break;
        }

        case 'PLAYER_UPDATE': {
          if (currentRoom) {
            const target = playerRole === 'p1' ? currentRoom.client : currentRoom.host;
            if (target && target.readyState === WebSocket.OPEN) {
              target.send(JSON.stringify({
                type: 'REMOTE_PLAYER_UPDATE',
                playerRole,
                state: data.state
              }));
            }
          }
          break;
        }

        case 'OBJECT_UPDATE': {
          if (currentRoom) {
            const target = playerRole === 'p1' ? currentRoom.client : currentRoom.host;
            if (target && target.readyState === WebSocket.OPEN) {
              target.send(JSON.stringify({
                type: 'REMOTE_OBJECT_UPDATE',
                objectId: data.objectId,
                objectState: data.objectState
              }));
            }
          }
          break;
        }

        case 'LEVEL_CHANGE': {
          if (currentRoom && playerRole === 'p1') {
            currentRoom.levelIndex = data.levelIndex;
            const payload = JSON.stringify({
              type: 'LEVEL_CHANGE',
              levelIndex: data.levelIndex
            });
            currentRoom.client?.send(payload);
          }
          break;
        }

        case 'CHECKPOINT_REACHED': {
          if (currentRoom) {
            const payload = JSON.stringify({
              type: 'CHECKPOINT_REACHED',
              checkpointId: data.checkpointId
            });
            currentRoom.host?.send(payload);
            currentRoom.client?.send(payload);
          }
          break;
        }

        case 'RESPAWN': {
          if (currentRoom) {
            // 1-second per-connection cooldown: prevents griefing via rapid-fire respawn spam.
            // Both players legitimately trigger RESPAWN on fall detection, so we use a
            // cooldown rather than a host-only guard (which would break P2 fall recovery).
            const now = Date.now();
            if (ws._lastRespawn && now - ws._lastRespawn < 1000) break;
            ws._lastRespawn = now;

            const payload = JSON.stringify({ type: 'RESPAWN' });
            currentRoom.host?.send(payload);
            currentRoom.client?.send(payload);
          }
          break;
        }

        case 'CHAT_MESSAGE': {
          if (currentRoom && typeof data.text === 'string') {
            // Server-side length cap (client maxlength is bypassable via raw WS)
            const text = data.text.trim().slice(0, 60);
            if (!text) break;

            // Rate limiting: max 5 messages per 3-second window per connection
            const now = Date.now();
            if (!ws._chatTs) ws._chatTs = [];
            ws._chatTs = ws._chatTs.filter(t => now - t < 3000);
            if (ws._chatTs.length >= 5) {
              // Silently drop — no error sent back (avoids timing oracle)
              break;
            }
            ws._chatTs.push(now);

            const payload = JSON.stringify({
              type: 'CHAT_MESSAGE',
              sender: playerRole,
              text
            });
            currentRoom.host?.send(payload);
            currentRoom.client?.send(payload);
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error processing websocket message:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      const otherPlayer = playerRole === 'p1' ? currentRoom.client : currentRoom.host;
      if (otherPlayer && otherPlayer.readyState === WebSocket.OPEN) {
        otherPlayer.send(JSON.stringify({
          type: 'PLAYER_DISCONNECTED',
          playerRole
        }));
      }
      if (playerRole === 'p1') {
        rooms.delete(currentRoom.code);
      } else if (currentRoom.client === ws) {
        currentRoom.client = null;
      }
    }
  });
});

server.listen(PORT, () => {
  const ip = getLocalIp();
  console.log(`====================================================`);
  console.log(`  SPLIT REALITY Game Server (Express + Vite + WS)`);
  console.log(`  Local URL:   http://localhost:${PORT}`);
  console.log(`  Network URL: http://${ip}:${PORT}`);
  console.log(`====================================================`);
});
