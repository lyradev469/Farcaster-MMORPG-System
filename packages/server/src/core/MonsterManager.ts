/**
 * MonsterManager - Monster AI, spawning, and ecosystem management
 * Handles: Monster state machine, aggro system, pathfinding, respawn, loot
 */

import { Entity } from '../types/entity.js';
import { Zone } from '../types/zone.js';
import { GameManager } from './GameManager.js';

type MonsterState = 'idle' | 'wander' | 'aggro' | 'chase' | 'attack' | 'return';

interface MonsterConfig {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  aggroRange: number;
  chaseRange: number;
  expReward: number;
  dropTable: DropItem[];
  states: MonsterState;
}

interface DropItem {
  id: string;
  name: string;
  chance: number; // 0-1
  minCount: number;
  maxCount: number;
}

export class MonsterManager {
  private gameManager: GameManager;
  private monsters: Map<string, Entity> = new Map();
  private monsterConfigs: Map<string, MonsterConfig> = new Map();
  private monsterStates: Map<string, { state: MonsterState; targetId?: string; lastAction: number }> = new Map();
  private spawnQueue: Array<{ zoneId: string; configId: string; x: number; y: number }> = [];

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
    this.initializeMonsterDatabase();
  }

  private initializeMonsterDatabase() {
    // Puny Rat (beginner monster)
    this.monsterConfigs.set('puny_rat', {
      id: 'puny_rat',
      name: 'Puny Rat',
      level: 1,
      hp: 50,
      maxHp: 50,
      attack: 15,
      defense: 5,
      speed: 50,
      aggroRange: 150,
      chaseRange: 400,
      expReward: 10,
      dropTable: [
        { id: 'rat_tail', name: 'Rat Tail', chance: 0.3, minCount: 1, maxCount: 3 },
        { id: 'herb', name: 'Green Herb', chance: 0.2, minCount: 1, maxCount: 2 }
      ],
      states: ['idle', 'wander', 'aggro', 'chase', 'attack', 'return']
    });

    // Porcup (beginner monster with defense)
    this.monsterConfigs.set('porcup', {
      id: 'porcup',
      name: 'Porcup',
      level: 3,
      hp: 80,
      maxHp: 80,
      attack: 20,
      defense: 15,
      speed: 45,
      aggroRange: 200,
      chaseRange: 450,
      expReward: 20,
      dropTable: [
        { id: 'porcup_quill', name: 'Porcup Quill', chance: 0.25, minCount: 1, maxCount: 2 },
        { id: 'potion_small', name: 'Small Potion', chance: 0.05, minCount: 1, maxCount: 1 }
      ],
      states: ['idle', 'wander', 'aggro', 'chase', 'attack', 'return']
    });

    // Crab (water monster)
    this.monsterConfigs.set('crab', {
      id: 'crab',
      name: 'Crab',
      level: 5,
      hp: 120,
      maxHp: 120,
      attack: 25,
      defense: 20,
      speed: 40,
      aggroRange: 180,
      chaseRange: 400,
      expReward: 35,
      dropTable: [
        { id: 'crab_shell', name: 'Crab Shell', chance: 0.4, minCount: 1, maxCount: 2 },
        { id: 'crab_meat', name: 'Crab Meat', chance: 0.6, minCount: 1, maxCount: 3 }
      ],
      states: ['idle', 'wander', 'aggro', 'chase', 'attack', 'return']
    });

    // Steel Tiger (intermediate)
    this.monsterConfigs.set('steel_tiger', {
      id: 'steel_tiger',
      name: 'Steel Tiger',
      level: 12,
      hp: 300,
      maxHp: 300,
      attack: 50,
      defense: 25,
      speed: 70,
      aggroRange: 250,
      chaseRange: 600,
      expReward: 120,
      dropTable: [
        { id: 'tiger_fang', name: 'Tiger Fang', chance: 0.2, minCount: 1, maxCount: 2 },
        { id: 'tiger_skin', name: 'Tiger Skin', chance: 0.1, minCount: 1, maxCount: 1 },
        { id: 'potion_medium', name: 'Medium Potion', chance: 0.08, minCount: 1, maxCount: 1 }
      ],
      states: ['idle', 'wander', 'aggro', 'chase', 'attack', 'return']
    });

    // Orc Warrior (boss)
    this.monsterConfigs.set('orc_warrior', {
      id: 'orc_warrior',
      name: 'Orc Warrior',
      level: 20,
      hp: 800,
      maxHp: 800,
      attack: 80,
      defense: 40,
      speed: 60,
      aggroRange: 300,
      chaseRange: 800,
      expReward: 500,
      dropTable: [
        { id: 'orc_tusk', name: 'Orc Tusk', chance: 0.3, minCount: 1, maxCount: 2 },
        { id: 'orc_helm', name: 'Orcish Helm', chance: 0.02, minCount: 1, maxCount: 1 },
        { id: 'iron', name: 'Iron', chance: 0.5, minCount: 2, maxCount: 5 }
      ],
      states: ['idle', 'wander', 'aggro', 'chase', 'attack', 'return']
    });
  }

  spawnMonsters(zone: Zone, count: number) {
    const configKeys = Array.from(this.monsterConfigs.keys());
    
    for (let i = 0; i < count; i++) {
      const configId = configKeys[Math.floor(Math.random() * configKeys.length)];
      const config = this.monsterConfigs.get(configId);
      if (!config) continue;

      // Random position within zone
      const x = Math.random() * zone.bounds.width;
      const y = Math.random() * zone.bounds.height;

      const monsterId = `monster_${Date.now()}_${i}`;
      const monster: Entity = {
        id: monsterId,
        name: config.name,
        type: 'monster',
        configId,
        level: config.level,
        hp: config.hp,
        maxHp: config.maxHp,
        attack: config.attack,
        defense: config.defense,
        speed: config.speed,
        expReward: config.expReward,
        position: { x, y, zone: zone.id },
        state: 'idle',
        targetId: null,
        lastAction: Date.now()
      };

      this.monsters.set(monsterId, monster);
      this.monsterStates.set(monsterId, {
        state: 'idle',
        lastAction: Date.now()
      });
      zone.monsters.add(monsterId);
    }
  }

  respawnMonster(monsterId: string) {
    const monster = this.monsters.get(monsterId);
    if (!monster) return;

    // Reset state
    monster.hp = monster.maxHp;
    monster.state = 'idle';

    const state = this.monsterStates.get(monsterId);
    if (state) {
      state.state = 'idle';
      state.lastAction = Date.now();
    }

    this.monsters.set(monsterId, monster);
  }

  updateAI(now: number) {
    for (const [monsterId, state] of this.monsterStates.entries()) {
      const monster = this.monsters.get(monsterId);
      if (!monster) continue;

      // Skip dead monsters
      if (monster.hp <= 0) continue;

      // Throttle AI updates (every 500ms)
      if (now - state.lastAction < 500) continue;

      const config = this.monsterConfigs.get(monster.configId);
      if (!config) continue;

      // State machine logic
      switch (state.state) {
        case 'idle':
          this.handleIdle(monster, now, config);
          break;
        case 'wander':
          this.handleWander(monster, now, config);
          break;
        case 'aggro':
          this.handleAggro(monster, state.targetId!, now, config);
          break;
        case 'chase':
          this.handleChase(monster, state.targetId!, now, config);
          break;
        case 'attack':
          this.handleAttack(monster, state.targetId!, now, config);
          break;
        case 'return':
          this.handleReturn(monster, now, config);
          break;
      }

      state.lastAction = now;
    }
  }

  private handleIdle(monster: Entity, now: number, config: MonsterConfig) {
    // Check for nearby players
    const nearbyPlayer = this.findNearbyPlayer(monster, config.aggroRange);
    
    if (nearbyPlayer) {
      this.monsterStates.set(monster.id, {
        state: 'aggro',
        targetId: nearbyPlayer.id,
        lastAction: now
      });
    } else {
      // Chance to wander (20%)
      if (Math.random() < 0.2) {
        this.monsterStates.set(monster.id, {
          state: 'wander',
          lastAction: now
        });
      }
    }
  }

  private handleWander(monster: Entity, now: number, config: MonsterConfig) {
    // Check for enemies during wander
    const nearbyPlayer = this.findNearbyPlayer(monster, config.aggroRange);
    
    if (nearbyPlayer) {
      this.monsterStates.set(monster.id, {
        state: 'aggro',
        targetId: nearbyPlayer.id,
        lastAction: now
      });
      return;
    }

    // Random movement
    const wanderDistance = 200;
    const angle = Math.random() * Math.PI * 2;
    const x = monster.position.x + Math.cos(angle) * wanderDistance;
    const y = monster.position.y + Math.sin(angle) * wanderDistance;

    // Keep within zone bounds
    monster.position.x = Math.max(0, Math.min(x, 3200));
    monster.position.y = Math.max(0, Math.min(y, 3200));

    // Stop wandering after some time
    if (Math.random() < 0.1) {
      this.monsterStates.set(monster.id, {
        state: 'idle',
        lastAction: now
      });
    }
  }

  private handleAggro(monster: Entity, targetId: string, now: number, config: MonsterConfig) {
    const target = this.gameManager.getPlayer(targetId) || this.gameManager.getEntity(targetId);
    
    if (!target) {
      // Target lost, return to idle
      this.monsterStates.set(monster.id, { state: 'idle', lastAction: now });
      return;
    }

    const distance = this.getDistance(monster.position, target.position);

    if (distance <= config.aggroRange) {
      // Start chasing
      this.monsterStates.set(monster.id, {
        state: 'chase',
        targetId,
        lastAction: now
      });
    } else {
      // Lose aggro
      this.monsterStates.set(monster.id, {
        state: 'idle',
        lastAction: now
      });
    }
  }

  private handleChase(monster: Entity, targetId: string, now: number, config: MonsterConfig) {
    const target = this.gameManager.getPlayer(targetId) || this.gameManager.getEntity(targetId);
    
    if (!target) {
      this.monsterStates.set(monster.id, {
        state: 'return',
        targetId,
        lastAction: now
      });
      return;
    }

    const distance = this.getDistance(monster.position, target.position);

    // Move towards target
    if (distance > 50) {
      const angle = Math.atan2(
        target.position.y - monster.position.y,
        target.position.x - monster.position.x
      );

      monster.position.x += Math.cos(angle) * config.speed;
      monster.position.y += Math.sin(angle) * config.speed;
    } else {
      // In range, start attacking
      this.monsterStates.set(monster.id, {
        state: 'attack',
        targetId,
        lastAction: now
      });
    }

    // Check if lost target
    if (distance > config.chaseRange) {
      this.monsterStates.set(monster.id, {
        state: 'return',
        targetId,
        lastAction: now
      });
    }
  }

  private handleAttack(monster: Entity, targetId: string, now: number, config: MonsterConfig) {
    const target = this.gameManager.getPlayer(targetId) || this.gameManager.getEntity(targetId);
    
    if (!target) {
      this.monsterStates.set(monster.id, {
        state: 'chase',
        targetId,
        lastAction: now
      });
      return;
    }

    const distance = this.getDistance(monster.position, target.position);
    
    // Check range
    if (distance > 80) {
      this.monsterStates.set(monster.id, {
        state: 'chase',
        targetId,
        lastAction: now
      });
      return;
    }

    // Random attack interval (1-3 seconds)
    if (Math.random() < 0.05) { // ≈200ms * 0.05 = 1% chance per tick, approx 1-2 attacks/sec
      this.performMonsterAttack(monster, target);
    }

    // Check if target dead
    if (target.hp <= 0) {
      this.monsterStates.set(monster.id, {
        state: 'idle',
        lastAction: now
      });
    }
  }

  private performMonsterAttack(monster: Entity, target: Player | Entity) {
    // Simple damage formula
    const damage = Math.max(1, monster.attack - (target.defense || 0));
    const variance = (Math.random() - 0.5) * 0.2;
    const actualDamage = Math.floor(damage * (1 + variance));

    target.hp = Math.max(0, target.hp - actualDamage);

    // Send damage event to target
    if ('stats' in target) { // It's a player
      this.sendToPlayer(target, {
        type: 'monster_attack',
        sourceId: monster.id,
        sourceName: monster.name,
        damage: actualDamage
      });
    }

    // Check for kill
    if (target.hp <= 0 && !('stats' in target)) {
      // Monster spawned player, handle logic
    }
  }

  private handleReturn(monster: Entity, now: number, config: MonsterConfig) {
    // Return to spawn point or reset
    this.monsterStates.set(monster.id, {
      state: 'idle',
      lastAction: now
    });
  }

  private findNearbyPlayer(monster: Entity, range: number): Player | null {
    for (const player of this.gameManager['_players'].values()) {
      const distance = this.getDistance(monster.position, player.position);
      if (distance <= range) {
        return player;
      }
    }
    return null;
  }

  private getDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private sendToPlayer(player: Player, packet: any) {
    const client = Array.from(this.gameManager['_clients'].values())
      .find(c => c.player?.id === player.id);
    
    if (client?.ws.readyState === 1) {
      client.ws.send(JSON.stringify(packet));
    }
  }

  getMonsterCount(): number {
    return this.monsters.size;
  }

  getMonstersInZone(zoneId: string): Entity[] {
    const zone = this.gameManager['_zones'].get(zoneId);
    if (!zone) return [];

    return Array.from(zone.monsters)
      .map(id => this.monsters.get(id))
      .filter((m): m is Entity => m !== undefined);
  }
}
