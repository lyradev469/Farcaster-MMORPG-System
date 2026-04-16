/**
 * MMO Server - Authoritative Game Engine
 * Handles: WebSocket connections, tick loop, state management, AI agents
 */

import { WebSocketServer } from 'ws';
import { Server } from 'http';
import Redis from 'ioredis';
import { GameManager } from './core/GameManager.js';
import { AIService } from './ai/AIService.js';
import { createHTTPServer } from './api/HTTPServer.js';

const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize Redis
const redis = new Redis(REDIS_URL);

// Game state manager
const gameManager = new GameManager(redis);

// AI Agent service
const aiService = new AIService(gameManager, redis);

// Start HTTP API server
const httpServer = createHTTPServer({ gameManager, aiService, redis, PORT: PORT as unknown as number });

// Start WebSocket server
const wsServer = new WebSocketServer({ port: WS_PORT as unknown as number });

wsServer.on('connection', (ws, req) => {
  const clientId = crypto.randomUUID();
  console.log(`[WS] Client connected: ${clientId}`);
  
  gameManager.addClient(clientId, ws);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      await gameManager.handleMessage(clientId, message);
    } catch (err) {
      console.error('[WS] Message error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected: ${clientId}`);
    gameManager.removeClient(clientId);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Client error ${clientId}:`, err);
    gameManager.removeClient(clientId);
  });

  // Send initial world state
  ws.send(JSON.stringify({ 
    type: 'init', 
    clientId,
    timestamp: Date.now()
  }));
});

// Main tick loop (20 TPS = 50ms)
const TICK_RATE = 50;
let lastTick = Date.now();

const tick = async () => {
  const now = Date.now();
  if (now - lastTick >= TICK_RATE) {
    try {
      await gameManager.tick(now);
      await aiService.processAgents(now);
      lastTick = now;
    } catch (err) {
      console.error('[TICK] Error:', err);
    }
  }
};

setInterval(tick, TICK_RATE);

console.log(`✅ MMO Server started on WS:${WS_PORT} HTTP:${PORT}`);
console.log(`   Redis: ${REDIS_URL}`);
console.log(`   Tick rate: ${1000/TICK_RATE} TPS`);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Received SIGTERM, cleaning up...');
  wsServer.close();
  httpServer.close();
  redis.quit();
  process.exit(0);
});
