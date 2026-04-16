/**
 * Main Farcaster Mini App shell
 * Integrates: Next.js, Phaser World Engine, PixiJS UI Overlay
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { UIOverlay, HUDState } from '@/lib/UIOverlay';
import '../styles/globals.css';

const SERVER_WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';
const SERVER_HTTP_URL = process.env.NEXT_PUBLIC_HTTP_URL || 'http://localhost:3000';

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [hudState, setHudState] = useState<HUDState>({
    hp: 100,
    maxHp: 100,
    sp: 50,
    maxSp: 50,
    exp: 0,
    nextExp: 100,
    level: 1,
    job: 'Novice'
  });
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uiRef = useRef<UIOverlay | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Initialize Pixi UI Overlay
    if (!canvasRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const app = new PIXI.Application({
      width,
      height,
      backgroundColor: 0x1099bb,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });

    canvasRef.current.appendChild(app.view as any);

    const ui = new UIOverlay();
    ui.init({ playerId: 'local', width, height });
    uiRef.current = ui;

    // Handle resize
    const handleResize = () => {
      app.resize(width, height);
      ui.destroy();
      ui.init({ playerId: 'local', width, height });
      uiRef.current = ui;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      app.destroy(true);
      ui.destroy();
    };
  }, []);

  useEffect(() => {
    // WebSocket connection
    const ws = new WebSocket(SERVER_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Main] Connected to game server');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleMessage(message);
    };

    ws.onclose = () => {
      console.log('[Main] Disconnected from game server');
      setConnected(false);
    };

    ws.onerror = (err) => {
      console.error('[Main] WebSocket error:', err);
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleMessage = (message: any) => {
    switch (message.type) {
      case 'init':
        setPlayerId(message.clientId);
        break;

      case 'state_delta':
        if (uiRef.current) {
          uiRef.current.updateHUD({
            hp: message.hp,
            maxHp: message.maxHp,
            sp: message.sp,
            maxSp: message.maxSp,
            exp: message.exp,
            nextExp: message.nextExp,
            level: message.level,
            job: message.job
          });
        }
        break;

      case 'combat_result':
        if (uiRef.current) {
          const { damage, isCritical, targetId } = message;
          // Show damage number at target position
          uiRef.current.showDamageNumber(
            Math.random() * window.screen.width,
            Math.random() * window.screen.height,
            damage,
            isCritical
          );
        }
        break;

      case 'chat':
        setChatMessages(prev => [...prev.slice(-9), `${message.username}: ${message.message}`]);
        break;

      case 'skill_cast_start':
        if (uiRef.current) {
          uiRef.current.showFloatingText(
            window.innerWidth / 2,
            window.innerHeight / 2,
            'Casting...',
            0xffff00
          );
        }
        break;
    }
  };

  const sendAction = (action: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(action));
    }
  };

  const handleMove = (x: number, y: number) => {
    sendAction({
      type: 'move',
      data: { x, y }
    });
  };

  const handleAttack = (targetId: string) => {
    sendAction({
      type: 'attack',
      data: { targetId }
    });
  };

  const handleSkill = (skillId: string, targetId?: string) => {
    sendAction({
      type: 'cast_skill',
      data: { skillId, targetId }
    });
  };

  const handleChat = (message: string) => {
    sendAction({
      type: 'chat',
      data: { message, channel: 'general' }
    });
  };

  return (
    <div className="game-container">
      {/* Phaser World Canvas - rendered elsewhere */}
      <div id="phaser-canvas" className="world-layer" />

      {/* Pixi UI Overlay */}
      <canvas ref={canvasRef} className="ui-layer" />

      {/* Farcaster Mini App Header */}
      <header className="app-header">
        <h1>🌙 Farcaster MMORPG</h1>
        <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 Online' : '🔴 Offline'}
        </div>
        {playerId && <div className="player-id">ID: {playerId.slice(0, 8)}...</div>}
      </header>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button onClick={() => handleAttack('nearest_monster')} disabled={!connected}>
          ⚔️ Attack Nearest
        </button>
        <button onClick={() => handleSkill('attack')} disabled={!connected}>
          🗡️ Basic Attack
        </button>
        <button onClick={() => handleSkill('heal')} disabled={!connected}>
          💚 Heal
        </button>
        <button onClick={() => handleChat('Hello world!')} disabled={!connected}>
          💬 Chat
        </button>
      </div>

      {/* Chat Overlay */}
      <div className="chat-overlay">
        {chatMessages.map((msg, i) => (
          <div key={i} className="chat-message">{msg}</div>
        ))}
        <input
          type="text"
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleChat((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = '';
            }
          }}
          className="chat-input"
        />
      </div>

      {/* Instructions */}
      <div className="instructions">
        <h3>Controls:</h3>
        <ul>
          <li>Arrow Keys / WASD - Move</li>
          <li>Click on ground - Move to location</li>
          <li>1-4 - Use skills</li>
          <li>Enter - Chat</li>
        </ul>
      </div>

      <style jsx>{`
        .game-container {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #000;
        }

        .world-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        .ui-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10;
          pointer-events: none;
        }

        .app-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 20;
          padding: 10px 20px;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: white;
        }

        .connection-status {
          padding: 5px 10px;
          border-radius: 5px;
          font-size: 12px;
        }

        .connection-status.connected {
          background: #22c55e;
        }

        .connection-status.disconnected {
          background: #ef4444;
        }

        .player-id {
          font-size: 12px;
          opacity: 0.7;
        }

        .quick-actions {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 20;
          display: flex;
          gap: 10px;
        }

        .quick-actions button {
          padding: 10px 20px;
          font-size: 14px;
          border: none;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          pointer-events: auto;
        }

        .quick-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .chat-overlay {
          position: absolute;
          bottom: 100px;
          left: 20px;
          z-index: 20;
          width: 300px;
          max-height: 200px;
          overflow-y: auto;
          pointer-events: auto;
        }

        .chat-message {
          padding: 5px;
          font-size: 12px;
          color: white;
          text-shadow: 1px 1px 2px black;
        }

        .chat-input {
          width: 100%;
          padding: 8px;
          margin-top: 5px;
          border: none;
          border-radius: 5px;
          font-size: 14px;
        }

        .instructions {
          position: absolute;
          top: 60px;
          right: 20px;
          z-index: 20;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 15px;
          border-radius: 10px;
          font-size: 12px;
          pointer-events: auto;
        }

        .instructions ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .instructions li {
          margin: 5px 0;
        }
      `}</style>
    </div>
  );
}
