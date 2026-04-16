/**
 * HTTPServer - REST API for AI agents and external integrations
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { GameManager } from '../core/GameManager.js';
import { AIService } from '../ai/AIService.js';

interface ServerConfig {
  gameManager: GameManager;
  aiService: AIService;
  redis: any;
  PORT: number;
}

export function createHTTPServer(config: ServerConfig) {
  const { gameManager, aiService, redis } = config;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = parse(req.url || '/', true);
    const method = req.method || 'GET';
    const path = url.pathname || '/';

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    res.setHeader('Content-Type', 'application/json');

    try {
      // Handle JSON body
      let body = {};
      if (method === 'POST' || method === 'PUT') {
        const chunks: Buffer[] = [];
        for await (const chunk of req as any) {
          chunks.push(chunk);
        }
        body = JSON.parse(Buffer.concat(chunks).toString());
      }

      // Route handling
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (path === '/agent/register' && method === 'POST') {
        const result = await aiService.registerAgent(body as any);
        res.writeHead(result.success ? 200 : 400);
        res.end(JSON.stringify(result));
        return;
      }

      if (path === '/agent/list' && method === 'GET') {
        const agents = aiService.listAgents();
        res.writeHead(200);
        res.end(JSON.stringify({ agents }));
        return;
      }

      if (path === '/agent/stats' && method === 'GET') {
        const agentId = (url.query as any).agentId;
        if (!agentId) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'agentId required' }));
          return;
        }
        const stats = aiService.getAgentStats(agentId);
        res.writeHead(stats ? 200 : 404);
        res.end(JSON.stringify(stats || { error: 'Agent not found' }));
        return;
      }

      if (path.startsWith('/action/') && method === 'POST') {
        const result = await aiService.handleAPI(path, method, body, token);
        res.writeHead(result.error ? 400 : 200);
        res.end(JSON.stringify(result));
        return;
      }

      if (path === '/state' && method === 'GET') {
        const result = await aiService.handleAPI(path, method, {}, token);
        res.writeHead(result.error ? 401 : 200);
        res.end(JSON.stringify(result));
        return;
      }

      if (path === '/world/nearby' && method === 'GET') {
        const result = await aiService.handleAPI(path, method, {}, token);
        res.writeHead(result.error ? 401 : 200);
        res.end(JSON.stringify(result));
        return;
      }

      if (path === '/combat/log' && method === 'GET') {
        const result = await aiService.handleAPI(path, method, {}, token);
        res.writeHead(result.error ? 401 : 200);
        res.end(JSON.stringify(result));
        return;
      }

      if (path === '/agent/pause' && method === 'POST') {
        const { agentId } = body as any;
        if (!agentId) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'agentId required' }));
          return;
        }
        const success = aiService.pauseAgent(agentId);
        res.writeHead(success ? 200 : 404);
        res.end(JSON.stringify({ success }));
        return;
      }

      if (path === '/agent/resume' && method === 'POST') {
        const { agentId } = body as any;
        if (!agentId) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'agentId required' }));
          return;
        }
        const success = aiService.resumeAgent(agentId);
        res.writeHead(success ? 200 : 404);
        res.end(JSON.stringify({ success }));
        return;
      }

      if (path === '/agent/terminate' && method === 'POST') {
        const { agentId } = body as any;
        if (!agentId) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'agentId required' }));
          return;
        }
        const success = aiService.terminateAgent(agentId);
        res.writeHead(success ? 200 : 404);
        res.end(JSON.stringify({ success }));
        return;
      }

      if (path === '/health' && method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({
          status: 'ok',
          timestamp: Date.now(),
          players: gameManager['_players']?.size || 0,
          agents: aiService.listAgents().length,
          monsters: gameManager['_monsters']?.getMonsterCount() || 0
        }));
        return;
      }

      // 404
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));

    } catch (err: any) {
      console.error('[HTTP] Error:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  server.listen(config.PORT, () => {
    console.log(`🚀 HTTP API running on port ${config.PORT}`);
  });

  return server;
}
