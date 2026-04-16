/**
 * CombatSystem - Authoritative combat resolution
 * Handles: Attack logic, damage calculation, critical hits, defense, EXP distribution
 */

import { Player } from '../types/player.js';
import { Entity } from '../types/entity.js';
import { GameManager } from './GameManager.js';

interface CombatLog {
  timestamp: number;
  attackerId: string;
  targetId: string;
  damage: number;
  isCritical: boolean;
  skillId?: string;
  reason?: string;
}

export class CombatSystem {
  private gameManager: GameManager;
  private combatLogs: CombatLog[] = [];
  private cooldowns: Map<string, number> = new Map();

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  handleAttack(attacker: Player | Entity, targetId: string) {
    const target = this.gameManager.getEntity(targetId) || 
                   this.gameManager.getPlayer(targetId) ||
                   (this.gameManager as any).monsters.getEntity(targetId);

    if (!target) {
      attacker.hp = 0; // Invalid attack, reset
      return { success: false, reason: 'Target not found' };
    }

    // Check attack range
    const distance = this.getDistance(attacker.position, target.position);
    if (distance > 150) {
      return { success: false, reason: 'Out of range' };
    }

    // Calculate damage
    const damage = this.calculateDamage(attacker, target);
    const isCritical = this.checkCriticalHit(attacker);

    // Apply damage
    const actualDamage = Math.max(1, damage);
    target.hp = Math.max(0, target.hp - actualDamage);

    // Log combat
    this.logCombat(attacker, target, actualDamage, isCritical);

    // Send combat event
    this.broadcastCombatEvent({
      type: 'combat_result',
      attackerId: attacker.id,
      targetId: target.id,
      damage: actualDamage,
      isCritical,
      targetHp: target.hp,
      targetMaxHp: target.maxHp,
      timestamp: Date.now()
    });

    // Check for kill
    if (target.hp <= 0) {
      this.handleKill(attacker, target as Entity);
    }

    return { success: true, damage: actualDamage, isCritical };
  }

  private calculateDamage(attacker: Player | Entity, target: Player | Entity): number {
    // Base damage formula (Ragnarok-inspired)
    const baseDamage = this.getBaseDamage(attacker);
    const defense = this.getDefense(target);
    const weaponMultiplier = this.getWeaponMultiplier(attacker);
    
    // Damage = (Base * WeaponMult) - Defense + random variance
    const rawDamage = (baseDamage * weaponMultiplier) - defense;
    const variance = (Math.random() - 0.5) * 0.2; // ±10%
    
    return Math.max(1, Math.floor(rawDamage * (1 + variance)));
  }

  private getBaseDamage(entity: Player | Entity): number {
    if ('stats' in entity) {
      // Player
      const str = entity.stats.str;
      const agi = entity.stats.agi;
      return Math.floor(str * 2 + agi * 0.5);
    } else {
      // Monster
      return entity.attack || 50;
    }
  }

  private getDefense(entity: Player | Entity): number {
    if ('stats' in entity) {
      const vit = entity.stats.vit;
      return Math.floor(vit * 1.5);
    } else {
      return entity.defense || 10;
    }
  }

  private getWeaponMultiplier(entity: Player | Entity): number {
    if ('equipment' in entity && entity.equipment?.weapon) {
      const weapon = entity.equipment.weapon;
      return 1 + (weapon.atk || 0) * 0.01;
    }
    return 1.0; // Unarmed
  }

  private checkCriticalHit(attacker: Player | Entity): boolean {
    const luck = attacker.luk || (attacker.stats?.luk || 0);
    const critRate = luck * 0.5; // 0.5% per LUK
    return Math.random() * 100 < critRate;
  }

  private getDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private logCombat(attacker: Player | Entity, target: Player | Entity, damage: number, isCritical: boolean) {
    const log: CombatLog = {
      timestamp: Date.now(),
      attackerId: attacker.id,
      targetId: target.id,
      damage,
      isCritical,
      skillId: undefined
    };

    this.combatLogs.push(log);
    
    // Keep only last 1000 entries
    if (this.combatLogs.length > 1000) {
      this.combatLogs.shift();
    }
  }

  private broadcastCombatEvent(event: any) {
    // Send to target (damage feedback)
    const target = this.gameManager.getEntity(event.targetId) || this.gameManager.getPlayer(event.targetId);
    if (target) {
      this.sendToPlayer(target as Player, event);
    }

    // Send to nearby players
    for (const player of this.gameManager['_players'].values()) {
      const dx = player.position.x - target?.position.x || 0;
      const dy = player.position.y - target?.position.y || 0;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 500 && player.id !== event.targetId) {
        this.sendToPlayer(player, event);
      }
    }
  }

  private sendToPlayer(player: Player, packet: any) {
    const client = Array.from(this.gameManager['_clients'].values())
      .find(c => c.player?.id === player.id);
    
    if (client?.ws.readyState === 1) {
      client.ws.send(JSON.stringify(packet));
    }
  }

  private handleKill(attacker: Player | Entity, victim: Entity) {
    // Grant EXP
    const expReward = victim.expReward || 100;
    
    if ('stats' in attacker) {
      // Player kill
      attacker.exp += expReward;
      attacker.jobExp += expReward;
      
      this.checkLevelUp(attacker as Player);
    }

    // Respawn monster after delay
    if (!('stats' in victim)) {
      setTimeout(() => {
        this.gameManager['_monsters'].respawnMonster(victim.id);
      }, 30000); // 30 second respawn
    }

    // Log drop
    this.handleMonsterDrop(attacker, victim);
  }

  private checkLevelUp(player: Player) {
    if (player.exp >= player.nextExp) {
      player.exp -= player.nextExp;
      player.level++;
      player.nextExp = Math.floor(player.nextExp * 1.5);
      
      // Stat allocation
      player.stats.str += 2;
      player.stats.agi += 2;
      player.stats.vit += 2;
      player.stats.int += 2;
      player.stats.dex += 2;
      player.stats.luk += 1;

      // Reset HP/SP on level up
      player.maxHp = Math.floor(player.maxHp * 1.1);
      player.maxSp = Math.floor(player.maxSp * 1.1);
      player.hp = player.maxHp;
      player.sp = player.maxSp;

      this.broadcastLevelUp(player);
    }
  }

  private broadcastLevelUp(player: Player) {
    this.sendToPlayer(player, {
      type: 'level_up',
      level: player.level,
      stats: player.stats,
      maxHp: player.maxHp,
      maxSp: player.maxSp
    });
  }

  private handleMonsterDrop(killer: Player | Entity, monster: Entity) {
    // Simple drop table
    const dropChance = Math.random();
    if (dropChance < 0.3) {
      const item = this.generateDrop(monster);
      
      // Create drop entity or send to killer
      if ('stats' in killer) {
        this.sendToPlayer(killer as Player, {
          type: 'item_drop',
          item,
          source: monster.id
        });
      }
    }
  }

  private generateDrop(monster: Entity): any {
    const drops = [
      { id: 'potion_small', name: 'Small Potion', type: 'consumable', hp: 100 },
      { id: 'herb', name: 'Green Herb', type: 'material' },
      { id: 'monster_card', name: `${monster.name} Card`, type: 'card' }
    ];
    return drops[Math.floor(Math.random() * drops.length)];
  }

  processTick(now: number) {
    // Check cooldown expirations
    for (const [key, expires] of this.cooldowns.entries()) {
      if (now >= expires) {
        this.cooldowns.delete(key);
      }
    }
  }

  isOnCooldown(playerId: string, action: string): boolean {
    const key = `${playerId}:${action}`;
    return this.cooldowns.has(key);
  }

  setCooldown(playerId: string, action: string, duration: number) {
    const key = `${playerId}:${action}`;
    this.cooldowns.set(key, Date.now() + duration);
  }

  getCombatLogs(playerId: string, limit = 50): CombatLog[] {
    return this.combatLogs
      .filter(log => log.attackerId === playerId || log.targetId === playerId)
      .slice(-limit);
  }
}
