# Farcaster MMORPG - Production Hybrid Rendering System

A scalable, production-ready MMORPG for Farcaster Mini Apps using hybrid rendering architecture.

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Farcaster Mini App                   │
│                    (Next.js Shell)                     │
└────────────────┬───────────────────────────────────────┘
                 │
    ┌────────────┴────────────┬──────────────────────────┐
    │                         │                          │
┌───▼──────────┐      ┌──────▼─────────┐      ┌──────────▼──────┐
│ Phaser 3     │      │ PixiJS         │      │ Node.js MMO     │
│ World Engine │◄────►│ UI Overlay     │      │ Server          │
│              │ WebSocket │          │      │ (Authoritative) │
│ - Tilemaps   │      │ - HUD Bars     │      │ - Combat        │
│ - Sprites    │      │ - Damage nums  │      │ - AI Agents     │
│ - Animations │      │ - Skill wheel  │      │ - State mgmt    │
└──────────────┘      └────────────────┘      └─────────────────┘
                                                    │
                                              ┌─────▼─────┐
                                              │           │
                                              │ Redis +   │
                                              │ Postgres  │
                                              └───────────┘
```

## ✨ Features

### Core Systems
- ✅ **Hybrid Rendering**: Phaser for world + PixiJS for UI (zero overlap)
- ✅ **Authoritative Server**: All game logic on server-side
- ✅ **Real-time Sync**: WebSocket delta updates at 20 TPS
- ✅ **Interest Management**: Only send nearby entities
- ✅ **AI Agent System**: Autonomous agents via HTTP API

### Game Features
- ✅ **Job System**: Novice → Swordsman/Mage/Archer → Advanced classes
- ✅ **Skill System**: Cast times, cooldowns, SP costs, interrupts
- ✅ **Combat System**: Damage calculation, critical hits, defense
- ✅ **Party System**: 6-player parties, EXP sharing
- ✅ **Guild System**: 30-member guilds, skills, alliances
- ✅ **Monster AI**: State machine (idle → wander → aggro → chase → attack)
- ✅ **Equipment System**: Slots, upgrades, refinement
- ✅ **Economy**: Drop tables, loot distribution

### AI Agent Capabilities
- ✅ **Autonomous Gameplay**: Agents can play without human input
- ✅ **Behavior Parsing**: Load `skill.md` for custom strategies
- ✅ **Multi-Agent Coordination**: Form parties/guilds together
- ✅ **Goal-Driven**: EXP farming, PK, loot hunting modes
- ✅ **REST API**: Full control via HTTP endpoints

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Redis (for real-time state)
- PostgreSQL (optional, for persistence)

### Installation

```bash
# Install dependencies
npm install

# StartRedis (if not running)
redis-server

# Start server
cd packages/server
npm run dev

# Start client (new terminal)
cd packages/client
npm run dev
```

### Access
- Game Client: http://localhost:3000
- HTTP API: http://localhost:3001
- WebSocket: ws://localhost:3002

## 📡 API Reference

### AI Agent Registration

```bash
curl -X POST http://localhost:3001/agent/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "agent-001",
    "name": "EXP Farmer Alpha",
    "skillUrl": "https://yourserver.com/skill.md",
    "behavior": {
      "primary_goal": "exp",
      "risk_tolerance": 0.5,
      "hp_threshold": 0.3
    }
  }'
```

Response:
```json
{
  "success": true,
  "agentId": "agent_1714567890_abc123",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

### Agent Actions

```bash
# Move agent
curl -X POST http://localhost:3001/action/move \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"x": 1600, "y": 1600}'

# Attack target
curl -X POST http://localhost:3001/action/attack \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"targetId": "monster_123"}'

# Cast skill
curl -X POST http://localhost:3001/action/skill \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"skillId": "heal", "targetId": "agent_self"}'
```

### Get Agent State

```bash
curl http://localhost:3001/state \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🧠 Skill.md Format

See `skill.md` template in root directory. Agents parse this file to determine behavior:

```yaml
primary_goal: exp
risk_tolerance: 0.5
hp_threshold: 0.3
skill_priority: ['heal', 'attack', 'rage']
preferred_monsters: ['Puny Rat', 'Porcup']
party_with_agents: true
```

## 🎮 Client Integration

### Hybrid Rendering Rules

**Phaser 3 (World Layer)**:
- Tilemap rendering
- Player/monster sprites
- Animations
- Camera system
- Visual collision

**PixiJS (UI Overlay Layer)**:
- HP/SP/EXP bars
- Damage numbers
- Skill cooldowns
- Chat messages
- Party/guild UI

**NEVER cross-render**. Each layer has strict responsibilities.

### Example Integration

```typescript
// Main page (Next.js)
import { WorldEngine } from '@/lib/WorldEngine';
import { UIOverlay } from '@/lib/UIOverlay';

const world = new WorldEngine({
  serverUrl: 'ws://localhost:3002',
  playerId: 'player-123'
});

const ui = new UIOverlay();
ui.init({ width: 1920, height: 1080 });
ui.updateHUD({ hp: 100, maxHp: 100, level: 1 });

// Handle server messages
world.setOnCombatResult((result) => {
  ui.showDamageNumber(result.x, result.y, result.damage, result.crit);
});
```

## 🔐 Security Model

- **Server Authority**: All game logic on server, clients are dumb renderers
- **JWT Authentication**: All API calls require valid tokens
- **Input Validation**: Server validates every action
- **Rate Limiting**: Prevent spam/abuse
- **State Delta**: Only send changes, not full state

## 📊 Performance Targets

- **Players**: 1000+ concurrent
- **AI Agents**: 10,000+ autonomous
- **Tick Rate**: 20 TPS (50ms)
- **Latency**: < 100ms for nearby entities
- **Memory**: Object pooling, entity culling

## 🛠️ Development Checklist

### Phase 1: Core Infrastructure ✅
- [x] Project scaffold
- [x] Type definitions
- [x] HTTP API server
- [x] WebSocket infrastructure
- [x] Tick loop implementation

### Phase 2: Game Systems ✅
- [x] Player state management
- [x] Combat resolution
- [x] Skill system with cast times
- [x] Monster AI state machine
- [x] Party coordination
- [x] Guild system

### Phase 3: AI Agent System ✅
- [x] Agent registration
- [x] Behavior parsing (skill.md)
- [x] Autonomous action loop
- [x] HTTP action API
- [x] State persistence

### Phase 4: Client Rendering ✅
- [x] Phaser world engine
- [x] PixiJS UI overlay
- [x] Delta sync implementation
- [x] Farcaster Mini App shell
- [x] Mobile controls

### Phase 5: Production Polish ⏳
- [ ] Load testing suite
- [ ] Monitoring/observability
- [ ] Database migrations
- [ ] Docker deployment
- [ ] CDN for assets
- [ ] Anti-cheat system

## 📁 Project Structure

```
farcaster-mmorpg/
├── packages/
│   ├── server/
│   │   ├── src/
│   │   │   ├── index.ts                 # Main entry
│   │   │   ├── api/
│   │   │   │   └── HTTPServer.ts        # REST API
│   │   │   ├── ai/
│   │   │   │   └── AIService.ts         # AI agent engine
│   │   │   ├── core/
│   │   │   │   ├── GameManager.ts       # Main state manager
│   │   │   │   ├── CombatSystem.ts      # Combat logic
│   │   │   │   ├── SkillSystem.ts       # Skill handling
│   │   │   │   ├── MonsterManager.ts    # Monster AI
│   │   │   │   └── PartyManager.ts      # Party system
│   │   │   ├── modules/
│   │   │   │   └── GuildManager.ts      # Guild system
│   │   │   └── types/                   # TypeScript definitions
│   │   └── package.json
│   │
│   └── client/
│       ├── src/
│       │   ├── app/
│       │   │   └── page.tsx             # Next.js main page
│       │   ├── lib/
│       │   │   ├── WorldEngine.ts       # Phaser integration
│       │   │   └── UIOverlay.ts         # PixiJS integration
│       │   └── styles/
│       └── package.json
│
├── skill.md                             # AI behavior template
├── mmo-architecture.md                  # Architecture docs
└── README.md                            # This file
```

## 🤝 Contributing

This is an open-source project. Contributions welcome:
- Bug fixes
- New monsters/enemies
- Additional skills
- Job class expansions
- UI improvements
- Performance optimizations

## 📄 License

MIT License - Everything is open source and community-owned.

## 🎯 Next Steps

1. **Deploy Backend**: Run `npm run build` in server package
2. **Deploy Client**: `vercel` or standard Next.js hosting
3. **Configure Farcaster**: Set up Mini App with your domain
4. **Test AI Agents**: Use `skill.md` to create autonomous players
5. **Load Test**: Simulate 100+ concurrent connections

## 📞 Support

- Issues: GitHub Discussions
- Architecture: `mmo-architecture.md`
- API Docs: See API Reference section
- Skill.md Examples: `skill.md` in root

---

**Built with ❤️ for the Farcaster ecosystem**

*Ship first. Build in public. Own your tools.*
