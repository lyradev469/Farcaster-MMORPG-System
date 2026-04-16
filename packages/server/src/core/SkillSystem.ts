/**
 * SkillSystem - Skill casting, cooldowns, and effects
 * Handles: Skill validation, cast time, SP cost, effects, area calculations
 */

import { Player } from '../types/player.js';
import { GameManager } from './GameManager.js';

interface Skill {
  id: string;
  name: string;
  job: string;
  level: number;
  maxLevel: number;
  spCost: number;
  castTime: number;
  cooldown: number;
  range: number;
  area: number;
  damage: number;
  effect?: string;
  effectValue?: number;
}

interface ActiveSkill {
  skillId: string;
  playerId: string;
  castStart: number;
  castComplete: number;
  targetId?: string;
  status: 'casting' | 'ready' | 'cooldown';
}

export class SkillSystem {
  private gameManager: GameManager;
  private activeCasts: Map<string, ActiveSkill> = new Map();
  private skillDatabase: Skill[] = [];

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
    this.initializeSkillDatabase();
  }

  private initializeSkillDatabase() {
    // Sword skills
    this.skillDatabase = [
      // Novice
      { id: 'attack', name: 'Basic Attack', job: 'Novice', level: 1, maxLevel: 1,
        spCost: 0, castTime: 0, cooldown: 1000, range: 100, area: 0, damage: 1 },
      
      // Swordsman skills
      { id: 'spear_shout', name: 'Spear Shout', job: 'Swordsman', level: 1, maxLevel: 10,
        spCost: 6, castTime: 500, cooldown: 5000, range: 120, area: 0, damage: 1.2,
        effect: 'taunt' },
      
      { id: 'rage', name: 'Rage', job: 'Swordsman', level: 1, maxLevel: 10,
        spCost: 10, castTime: 0, cooldown: 20000, range: 0, area: 0, damage: 0,
        effect: 'buff_str' },
      
      // Knight skills
      { id: 'charge', name: 'Charge', job: 'Knight', level: 1, maxLevel: 10,
        spCost: 12, castTime: 0, cooldown: 8000, range: 200, area: 0, damage: 1.5 },
      
      { id: 'auto_spine', name: 'Auto-spine Charge', job: 'Knight', level: 1, maxLevel: 5,
        spCost: 8, castTime: 0, cooldown: 3000, range: 120, area: 0, damage: 1.1,
        effect: 'stun' },
      
      // Lord Knight skills
      { id: 'brandish_spear', name: 'Brandish Spear', job: 'Lord Knight', level: 1, maxLevel: 10,
        spCost: 8, castTime: 0, cooldown: 10000, range: 120, area: 200, damage: 2.0 },
      
      // Mage skills
      { id: 'firebolt', name: 'Firebolt', job: 'Mage', level: 1, maxLevel: 10,
        spCost: 8, castTime: 500, cooldown: 2000, range: 300, area: 0, damage: 1.3,
        effect: 'burn' },
      
      { id: 'stormgust', name: 'Stormgust', job: 'Wizard', level: 1, maxLevel: 5,
        spCost: 32, castTime: 2000, cooldown: 15000, range: 400, area: 300, damage: 2.5,
        effect: 'freeze' },
      
      // Archer skills
      { id: 'double_strafing', name: 'Double Strafing', job: 'Archer', level: 1, maxLevel: 10,
        spCost: 10, castTime: 0, cooldown: 3000, range: 350, area: 0, damage: 1.8 },
      
      { id: 'improvement', name: 'Improvement', job: 'Hunter', level: 1, maxLevel: 5,
        spCost: 15, castTime: 0, cooldown: 30000, range: 0, area: 0, damage: 0,
        effect: 'buff_dex' },
      
      // Healer skills
      { id: 'heal', name: 'Heal', job: 'Priest', level: 1, maxLevel: 10,
        spCost: 16, castTime: 1500, cooldown: 3000, range: 250, area: 0, damage: 0,
        effect: 'heal', effectValue: 0.8 },
      
      { id: 'magnus_exorcism', name: 'Magnus Exorcimus', job: 'High Priest', level: 1, maxLevel: 5,
        spCost: 40, castTime: 3000, cooldown: 60000, range: 0, area: 400, damage: 3.0,
        effect: 'undead_only' }
    ];
  }

  handleSkillCast(player: Player, skillId: string, targetId: string) {
    const skill = this.skillDatabase.find(s => s.id === skillId);
    if (!skill) {
      return { success: false, reason: 'Skill not found' };
    }

    // Check player has skill
    const playerSkill = player.skills.find(s => s.id === skillId);
    if (!playerSkill) {
      return { success: false, reason: 'Player does not have this skill' };
    }

    // Check SP cost
    if (player.sp < skill.spCost) {
      return { success: false, reason: 'Not enough SP' };
    }

    // Check cooldown
    if (this.isOnCooldown(player.id, skillId)) {
      return { success: false, reason: 'Skill on cooldown' };
    }

    // Check job requirement
    if (skill.job !== 'Novice' && !this.meetsJobRequirement(player.job, skill.job)) {
      return { success: false, reason: 'Job requirement not met' };
    }

    // Validate range
    const target = this.gameManager.getEntity(targetId) || 
                   this.gameManager.getPlayer(targetId);
    if (target) {
      const distance = this.getDistance(player.position, target.position);
      if (distance > skill.range + 100) {
        return { success: false, reason: 'Target out of range' };
      }
    }

    // Start casting
    const castDuration = skill.castTime;
    const activeSkill: ActiveSkill = {
      skillId,
      playerId: player.id,
      castStart: Date.now(),
      castComplete: Date.now() + castDuration,
      targetId: target?.id,
      status: castDuration > 0 ? 'casting' : 'ready'
    };

    this.activeCasts.set(`${player.id}:${skillId}`, activeSkill);

    // Deduct SP
    player.sp -= skill.spCost;

    // Notify player
    this.sendToPlayer(player, {
      type: 'skill_cast_start',
      skillId,
      castTime: castDuration,
      targetId: activeSkill.targetId
    });

    // If instant cast, execute immediately
    if (castDuration === 0) {
      return this.executeSkill(player, skill, target);
    }

    return { success: true, castTime };
  }

  private executeSkill(player: Player, skill: Skill, target: Player | entity | undefined) {
    // Interrupt check
    if (player.state === 'moving') {
      this.interruptCast(player, skill);
      return { success: false, reason: 'Cast interrupted by movement' };
    }

    // Calculate effect
    let result = { success: true };

    if (skill.effect === 'heal') {
      result = this.executeHeal(player, target as Player, skill);
    } else if (skill.damage > 0) {
      result = this.executeDamage(player, target as Player | Entity, skill);
    } else {
      result = this.executeBuff(player, skill);
    }

    // Set cooldown
    this.setCooldown(player.id, skill.id, skill.cooldown);

    // Remove active cast
    this.activeCasts.delete(`${player.id}:${skill.id}`);

    return result;
  }

  private executeHeal(caster: Player, target: Player, skill: Skill): any {
    const healAmount = Math.floor(target.maxHp * skill.effectValue);
    target.hp = Math.min(target.maxHp, target.hp + healAmount);

    // Broadcast
    this.broadcastSkillResult({
      type: 'skill_heal',
      casterId: caster.id,
      targetId: target.id,
      healAmount,
      skillId: skill.id
    });

    return { success: true, healAmount };
  }

  private executeDamage(caster: Player | Entity, target: Player | Entity, skill: Skill): any {
    const baseDamage = this.gameManager['_combat'].calculateDamage(caster, target);
    const skillMultiplier = skill.damage;
    const totalDamage = Math.floor(baseDamage * skillMultiplier);

    target.hp = Math.max(0, target.hp - totalDamage);

    // Broadcast
    this.broadcastSkillResult({
      type: 'skill_damage',
      casterId: caster.id,
      targetId: target.id,
      damage: totalDamage,
      skillId: skill.id
    });

    // Check for kill
    if (target.hp <= 0 && !('stats' in target)) {
      this.gameManager['_combat'].handleKill(caster, target as Entity);
    }

    return { success: true, damage: totalDamage };
  }

  private executeBuff(player: Player, skill: Skill): any {
    // Apply buff effects
    if (skill.effect === 'buff_str') {
      player.stats.str += 10;
    } else if (skill.effect === 'buff_dex') {
      player.stats.dex += 10;
    }

    this.broadcastSkillResult({
      type: 'skill_buff',
      playerId: player.id,
      skillId: skill.id,
      effect: skill.effect
    });

    return { success: true };
  }

  private interruptCast(player: Player, skill: Skill) {
    // Restore SP on interrupt
    player.sp += skill.spCost;

    this.activeCasts.delete(`${player.id}:${skill.id}`);

    this.sendToPlayer(player, {
      type: 'skill_interrupt',
      skillId: skill.id,
      reason: 'Movement interrupted cast'
    });
  }

  private meetsJobRequirement(currentJob: string, requiredJob: string): boolean {
    const jobTree: Record<string, string[]> = {
      'Novice': ['Swordsman', 'Mage', 'Archer', 'Acolyte', 'Merchant', 'Thief'],
      'Swordsman': ['Knight', 'Lord Knight'],
      'Mage': ['Wizard', 'High Wizard'],
      'Archer': ['Hunter', 'Sniper'],
      'Acolyte': ['Priest', 'High Priest'],
      'Merchant': ['White Merchant', 'Mechanic'],
      'Thief': ['Assassin', 'Shadow Cross']
    };

    if (currentJob === requiredJob) return true;
    if (jobTree[requiredJob]?.includes(currentJob)) return true;

    return jobTree[requiredJob] === requiredJob;
  }

  private getDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private async sendToPlayer(player: Player, packet: any) {
    const client = Array.from(this.gameManager['_clients'].values())
      .find(c => c.player?.id === player.id);
    
    if (client?.ws.readyState === 1) {
      client.ws.send(JSON.stringify(packet));
    }
  }

  private broadcastSkillResult(result: any) {
    // Send to involved players and nearby area
    const targetPosition = result.targetId 
      ? (this.gameManager.getPlayer(result.targetId)?.position || { x: 0, y: 0 })
      : (this.gameManager.getPlayer(result.casterId || result.playerId)?.position);

    if (!targetPosition) return;

    for (const player of this.gameManager['_players'].values()) {
      const dx = player.position.x - targetPosition.x;
      const dy = player.position.y - targetPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 600) {
        this.sendToPlayer(player, result);
      }
    }
  }

  processTick(now: number) {
    // Check cast completions
    for (const [key, active] of this.activeCasts.entries()) {
      if (active.status === 'casting' && now >= active.castComplete) {
        active.status = 'ready';
        
        const [playerId, skillId] = key.split(':');
        const player = this.gameManager.getPlayer(playerId);
        const skill = this.skillDatabase.find(s => s.id === skillId);

        if (player && skill) {
          this.executeSkill(player, skill, 
            this.gameManager.getPlayer(active.targetId!) || 
            this.gameManager.getEntity(active.targetId!)
          );
        }
      }
    }

    // Check if casting players moved
    for (const [key, active] of this.activeCasts.entries()) {
      if (active.status === 'casting') {
        const [playerId] = key.split(':');
        const player = this.gameManager.getPlayer(playerId);

        if (player?.state === 'moving') {
          const skill = this.skillDatabase.find(s => s.id === active.skillId);
          if (skill) {
            this.interruptCast(player, skill);
          }
        }
      }
    }
  }

  isOnCooldown(playerId: string, skillId: string): boolean {
    const key = `${playerId}:${skillId}`;
    const skill = this.skillDatabase.find(s => s.id === skillId);
    if (!skill) return true;

    const cooldownKey = `skill_cooldown:${key}`;
    return this.gameManager['_redis'].exists(cooldownKey) === 1;
  }

  setCooldown(playerId: string, skillId: string, duration: number) {
    const key = `${playerId}:${skillId}`;
    const cooldownKey = `skill_cooldown:${key}`;
    this.gameManager['_redis'].set(cooldownKey, '1', 'EX', Math.ceil(duration / 1000));
  }

  getAvailableSkills(job: string, level: number): Skill[] {
    return this.skillDatabase.filter(s => 
      (s.job === job || s.job === 'Novice') &&
      s.maxLevel >= level
    );
  }

  getSkill(skillId: string): Skill | undefined {
    return this.skillDatabase.find(s => s.id === skillId);
  }
}
