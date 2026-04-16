/**
 * GameManager - Core game state management and tick processing
 */

import { WebSocket } from 'ws';
import { Player, PlayerState } from '../types/player.js';
import { Entity } from '../types/entity.js';
import { CombatSystem } from './CombatSystem.js';
import { SkillSystem } from './SkillSystem.js';
import { MonsterManager } from './MonsterManager.js';
import { PartyManager } from './PartyManager.js';
import { GuildManager } from '../modules/GuildManager.js';
import { Zone } from '../types/zone.js';

interface Client {
  ws: WebSocket;
  player?: Player;
}

export class GameManager {
  private clients: Map<string, Client> = new Map();
  private players: Map<string, Player> = new Map();
  private entities: Map<string, Entity> = new Map();
  private zones: Map<string, Zone> = new Map();
  
  private combat: CombatSystem;
  private skills: SkillSystem;
  private monsters: MonsterManager;
  private parties: PartyManager;
  private guilds: GuildManager;
  
  private redis: any;

  constructor(redis: any) {
    this.redis = redis;
    this.combat = new CombatSystem(this);
    this.skills = new SkillSystem(this);
    this.monsters = new MonsterManager(this);
    this.parties = new PartyManager(this);
    this.guilds = new GuildManager(this);
    
    this.initializeWorld();
  }

  private initializeWorld() {
    // Create initial zone
    const zone: Zone = {
      id: 'zone_1',
      name: 'Beginner Plains',
      width: 100,
      height: 100,
      tileSize: 32,
      bounds: { x: 0, y: 0, width: 3200, height: 3200 },
      entities: new Set(),
      monsters: new Set()
    };
    this.zones.set(zone.id, zone);
    
    // Spawn initial monsters
    this.monsters.spawnMonsters(zone, 50);
  }

  addClient(id: string, ws: WebSocket) {
    this.clients.set(id, { ws });
  }

  removeClient(id: string) {
    const client = this.clients.get(id);
    if (client?.player?.id) {
      this.players.delete(client.player.id);
      this.redis.del(`player:${client.player.id}`);
    }
    this.clients.delete(id);
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  async handleMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client?.player) {
      // Handle auth/login
      if (message.type === 'login') {
        await this.handleLogin(clientId, message);
      }
      return;
    }

    const player = client.player;

    switch (message.type) {
      case 'move':
        this.handleMove(player, message.data);
        break;
      case 'attack':
        this.combat.handleAttack(player, message.data.targetId);
        break;
      case 'cast_skill':
        this.skills.handleSkillCast(player, message.data.skillId, message.data.targetId);
        break;
      case 'use_item':
        this.handleUseItem(player, message.data);
        break;
      case 'chat':
        this.handleChat(player, message.data);
        break;
      case 'party_invite':
        this.parties.handleInvite(player, message.data.targetId);
        break;
      case 'party_accept':
        this.parties.handleAccept(player, message.data.partyId);
        break;
      case 'guild_create':
        this.guilds.handleCreate(player, message.data);
        break;
      case 'guild_join':
        this.guilds.handleJoinRequest(player, message.data.guildId);
        break;
    }
  }

  private async handleLogin(clientId: string, message: any) {
    const { username, walletAddress } = message.data;
    
    // Check if player exists
    let player = this.players.get(username);
    
    if (!player) {
      // Create new player
      player = this.createPlayer(username, walletAddress);
      this.players.set(username, player);
    }

    const client = this.clients.get(clientId);
    if (client) {
      client.player = player;
    }

    // Send login response
    client?.ws.send(JSON.stringify({
      type: 'login_success',
      player: this.serializePlayer(player),
      worldState: this.getWorldSnapshot(player)
    }));

    // Publish to Redis for other servers
    await this.redis.publish('player:login', JSON.stringify({
      playerId: username,
      clientId,
      timestamp: Date.now()
    }));
  }

  private createPlayer(username: string, walletAddress?: string): Player {
    return {
      id: username,
      username,
      walletAddress,
      level: 1,
      job: 'Novice',
      stats: {
        str: 10,
        agi: 10,
        vit: 10,
        int: 10,
        dex: 10,
        luk: 10
      },
      position: { x: 1600, y: 1600, zone: 'zone_1' },
      hp: 100,
      maxHp: 100,
      sp: 50,
      maxSp: 50,
      exp: 0,
      jobExp: 0,
      nextExp: 100,
      skills: [],
      equipment: {
        weapon: null,
        armor: null,
        helmet: null,
        boots: null,
        accessory: null
      },
      inventory: [],
      state: 'idle',
      lastAction: Date.now()
    };
  }

  private handleMove(player: Player, data: { x: number; y: number }) {
    player.position.x = data.x;
    player.position.y = data.y;
    player.state = 'moving';
    player.lastAction = Date.now();
    
    // Update in Redis
    this.redis.hset(`player:${player.id}`, {
      x: player.position.x,
      y: player.position.y,
      state: player.state,
      lastAction: player.lastAction
    });
  }

  private handleUseItem(player: Player, data: { itemId: string }) {
    // Implement item usage logic
  }

  private handleChat(player: Player, data: { message: string; channel: string }) {
    const chatPacket = {
      type: 'chat',
      playerId: player.id,
      username: player.username,
      message: data.message,
      channel: data.channel,
      timestamp: Date.now()
    };

    // Broadcast to nearby players
    this.broadcastNearby(player.position, chatPacket);
  }

  private serializePlayer(player: Player): any {
    return {
      id: player.id,
      username: player.username,
      level: player.level,
      job: player.job,
      stats: player.stats,
      position: player.position,
      hp: player.hp,
      maxHp: player.maxHp,
      sp: player.sp,
      maxSp: player.maxSp,
      exp: player.exp,
      skills: player.skills,
      equipment: player.equipment
    };
  }

  getWorldSnapshot(player: Player): any {
    const zone = this.zones.get(player.position.zone);
    if (!zone) return null;

    // Get nearby entities (interest management)
    const nearbyRadius = 500;
    const nearbyEntities: Entity[] = [];
    const nearbyPlayers: Player[] = [];
    const nearbyMonsters: Entity[] = [];

    for (const [id, entity] of this.entities) {
      const dx = entity.position.x - player.position.x;
      const dy = entity.position.y - player.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < nearbyRadius) {
        nearbyEntities.push(entity);
      }
    }

    // Get nearby monsters from zone
    for (const monsterId of zone.monsters) {
      const monster = this.entities.get(monsterId);
      if (monster) nearbyMonsters.push(monster);
    }

    return {
      zone: zone.id,
      playerState: this.serializePlayer(player),
      nearbyEntities,
      nearbyMonsters,
      timestamp: Date.now()
    };
  }

  private broadcastNearby(origin: { x: number; y: number }, packet: any) {
    for (const [clientId, client] of this.clients) {
      if (client.player) {
        const dx = client.player.position.x - origin.x;
        const dy = client.player.position.y - origin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 500) {
          client.ws.send(JSON.stringify(packet));
        }
      }
    }
  }

  async tick(now: number) {
    // 1. Update monster AI
    this.monsters.updateAI(now);

    // 2. Process combat (cooldowns, channeling, etc.)
    this.combat.processTick(now);

    // 3. Process skills (casts, cooldowns)
    this.skills.processTick(now);

    // 4. Generate and broadcast deltas
    await this.broadcastStateDeltas();

    // 5. Persist critical state to Redis
    await this.persistState();
  }

  private async broadcastStateDeltas() {
    const deltas = new Map<string, any[]>();

    // Collect all state changes
    for (const player of this.players.values()) {
      const delta = {
        type: 'state_delta',
        playerId: player.id,
        position: player.position,
        hp: player.hp,
        state: player.state,
        timestamp: Date.now()
      };
      
      for (const [clientId, client] of this.clients) {
        if (client.player && client.player.id !== player.id) {
          const dx = client.player.position.x - player.position.x;
          const dy = client.player.position.y - player.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 500) {
            if (!deltas.has(clientId)) deltas.set(clientId, []);
            deltas.get(clientId)!.push(delta);
          }
        }
      }
    }

    // Send deltas to each client
    for (const [clientId, states] of deltas) {
      const client = this.clients.get(clientId);
      if (client?.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({
          type: 'batch',
          updates: states
        }));
      }
    }
  }

  private async persistState() {
    // Batch persist to Redis
    const pipeline = this.redis.pipeline();
    
    for (const player of this.players.values()) {
      pipeline.hset(`player:${player.id}`, {
        hp: player.hp,
        maxHp: player.maxHp,
        sp: player.sp,
        exp: player.exp,
        x: player.position.x,
        y: player.position.y,
        state: player.state,
        lastAction: player.lastAction,
        level: player.level,
        job: player.job
      });
    }

    await pipeline.exec();
  }
}
