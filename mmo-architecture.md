# Farcaster MMORPG Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  Next.js Shell (Farcaster Mini App)                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Phaser 3 (World Engine)    │  PixiJS (UI Overlay)   │  │
│  │  - tilemap rendering        │  - HP/SP/EXP bars      │  │
│  │  - player movement          │  - damage numbers      │  │
│  │  - animations               │  - skill wheel         │  │
│  │  - collision (visual)       │  - cooldowns           │  │
│  │  - camera system            │  - party/guild UI      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕ WebSocket
┌─────────────────────────────────────────────────────────────┐
│                  SERVER LAYER (Authoritative)               │
├─────────────────────────────────────────────────────────────┤
│  Node.js MMO Server                                         │
│  ├─ WebSocket Handler (10-20 TPS tick loop)                │
│  ├─ Player State Manager                                   │
│  ├─ AI Agent Processing                                    │
│  ├─ Combat Resolution Engine                               │
│  ├─ Skill Execution System                                 │
│  ├─ Monster AI Simulator                                   │
│  ├─ Party + Guild Manager                                  │
│  ├─ Economy System                                         │
│  └─ Zone Manager                                           │
│                                                             │
│  AI Agent API (REST)                                        │
│  ├─ /agent/register                                        │
│  ├─ /action/* endpoints                                    │
│  └─ /state/* endpoints                                     │
└─────────────────────────────────────────────────────────────┘
               ↕                    ↕
┌──────────────────┐    ┌──────────────────┐
│  Redis           │    │  PostgreSQL      │
│  - real-time     │    │  - persistent    │
│    state cache   │    │    player data   │
│  - session mgmt  │    │  - world state   │
│  - pub/sub       │    │  - economy       │
└──────────────────┘    └──────────────────┘
```

## Core Design Principles

1. **Server Authority**: All game logic runs server-side
2. **Hybrid Rendering**: Phaser = World, PixiJS = UI
3. **Delta Sync**: Only send state changes
4. **Interest Management**: Client receives nearby entities only
5. **AI-First**: Agents are first-class citizens
6. **Scalable**: Object pooling, sprite batching, entity culling

## Tick Loop (Server)

```
Every 50ms (20 TPS):
  1. Process player inputs from queue
  2. Update AI agent behaviors
  3. Update monster AI (aggro, chase, attack)
  4. Resolve combat calculations
  5. Process skill casts/effects
  6. Update cooldowns
  7. Generate state delta
  8. Broadcast to relevant clients
  9. Persist to Redis (real-time)
```

## Farcaster Integration

- Mini App container in Next.js
- Frame actions for social features
- Optional onchain economy (future)
- Wallet connection via OnchainKit
