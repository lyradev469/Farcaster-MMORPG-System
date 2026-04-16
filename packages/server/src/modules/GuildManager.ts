/**
 * GuildManager - Guild system for long-term social gameplay
 * Handles: Guild creation, membership, ranks, guild skills, wars
 */

import { Player } from '../types/player.js';
import { GameManager } from '../core/GameManager.js';

interface GuildMember {
  playerId: string;
  username: string;
  level: number;
  job: string;
  rank: 'member' | 'officer' | 'leader';
  expContribution: number;
  joinedAt: number;
}

interface GuildSkill {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  cost: number;
  effect: string;
  effectValue: number;
}

interface Guild {
  id: string;
  name: string;
  leaderId: string;
  emblem: string;
  members: GuildMember[];
  maxMembers: number;
  level: number;
  exp: number;
  nextExp: number;
  skills: GuildSkill[];
  alliances: string[]; // Guild IDs
  enemies: string[]; // Guild IDs
  castle?: string; // Territory ID
  created: number;
}

interface GuildInvite {
  guildId: string;
  inviterId: string;
  targetId: string;
  expires: number;
}

export class GuildManager {
  private gameManager: GameManager;
  private guilds: Map<string, Guild> = new Map();
  private memberGuilds: Map<string, string> = new Map(); // playerId -> guildId
  private invites: GuildInvite[] = [];
  private guildSkillsDB: GuildSkill[] = [
    { id: 'heal', name: 'Healing', level: 0, maxLevel: 10, cost: 100, effect: 'party_heal', effectValue: 0.1 },
    { id: 'str_up', name: 'Strength Up', level: 0, maxLevel: 10, cost: 150, effect: 'buff_str', effectValue: 5 },
    { id: 'def_up', name: 'Defense Up', level: 0, maxLevel: 10, cost: 150, effect: 'buff_def', effectValue: 5 },
    { id: 'exp_bonus', name: 'EXP Bonus', level: 0, maxLevel: 5, cost: 500, effect: 'exp_increase', effectValue: 0.05 },
  ];

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  handleCreate(player: Player, data: { name: string; emblem: string }) {
    if (this.memberGuilds.has(player.id)) {
      return { success: false, reason: 'Already in a guild' };
    }

    const guildId = `guild_${Date.now()}_${player.id}`;
    const guild: Guild = {
      id: guildId,
      name: data.name,
      leaderId: player.id,
      emblem: data.emblem,
      members: [{
        playerId: player.id,
        username: player.username,
        level: player.level,
        job: player.job,
        rank: 'leader',
        expContribution: 0,
        joinedAt: Date.now()
      }],
      maxMembers: 30,
      level: 1,
      exp: 0,
      nextExp: 1000,
      skills: [],
      alliances: [],
      enemies: [],
      created: Date.now()
    };

    this.guilds.set(guildId, guild);
    this.memberGuilds.set(player.id, guildId);

    this.broadcastGuildUpdate(guild, 'guild_created', player);

    return { success: true, guildId, guild: this.serializeGuild(guild) };
  }

  handleJoinRequest(player: Player, guildId: string) {
    const guild = this.guilds.get(guildId);
    if (!guild) {
      return { success: false, reason: 'Guild not found' };
    }

    if (this.memberGuilds.has(player.id)) {
      return { success: false, reason: 'Already in a guild' };
    }

    if (guild.members.length >= guild.maxMembers) {
      return { success: false, reason: 'Guild is full' };
    }

    // For small guilds, auto-join. For larger, officer/leader approval needed
    const leader = this.gameManager.getPlayer(guild.leaderId);
    if (leader) {
      this.sendToPlayer(leader, {
        type: 'guild_join_request',
        guildId,
        guildName: guild.name,
        requesterId: player.id,
        requesterName: player.username
      });
    }

    return { success: true, pending: true };
  }

  approveJoinRequest(leader: Player, playerId: string, guildId: string) {
    const guild = this.guilds.get(guildId);
    if (!guild || guild.leaderId !== leader.id) {
      return { success: false, reason: 'Not authorized' };
    }

    const player = this.gameManager.getPlayer(playerId);
    if (!player) {
      return { success: false, reason: 'Player not found' };
    }

    this.addMember(guild, player, 'member');
    
    return { success: true };
  }

  private addMember(guild: Guild, player: Player, rank: GuildMember['rank']) {
    guild.members.push({
      playerId: player.id,
      username: player.username,
      level: player.level,
      job: player.job,
      rank,
      expContribution: 0,
      joinedAt: Date.now()
    });

    this.memberGuilds.set(player.id, guild.id);

    this.sendToPlayer(player, {
      type: 'guild_join',
      guildId: guild.id,
      guildName: guild.name,
      emblem: guild.emblem,
      rank
    });

    this.broadcastGuildUpdate(guild, 'member_joined', player);
  }

  handleLeave(player: Player) {
    const guildId = this.memberGuilds.get(player.id);
    if (!guildId) return;

    const guild = this.guilds.get(guildId);
    if (!guild) return;

    const member = guild.members.find(m => m.playerId === player.id);
    if (!member) return;

    // Remove from guild
    guild.members = guild.members.filter(m => m.playerId !== player.id);
    this.memberGuilds.delete(player.id);

    // Check if guild should be dissolved
    if (guild.members.length === 0) {
      this.guilds.delete(guildId);
      this.broadcastGuildUpdate(guild, 'guild_dissolved');
    } else if (member.rank === 'leader') {
      // Transfer leadership
      const newLeader = guild.members.find(m => m.rank === 'officer') || guild.members[0];
      if (newLeader) {
        guild.leaderId = newLeader.playerId;
        newLeader.rank = 'leader';
        
        this.broadcastGuildUpdate(guild, 'leader_changed', player);
      }
    } else {
      this.broadcastGuildUpdate(guild, 'member_left', player);
    }
  }

  handleKick(leader: Player, memberId: string, guildId: string) {
    const guild = this.guilds.get(guildId);
    if (!guild || guild.leaderId !== leader.id) {
      return { success: false, reason: 'Not authorized' };
    }

    const member = guild.members.find(m => m.playerId === memberId);
    if (!member) {
      return { success: false, reason: 'Member not found' };
    }

    if (member.rank === 'leader') {
      return { success: false, reason: 'Cannot kick the leader' };
    }

    // Remove member
    guild.members = guild.members.filter(m => m.playerId !== memberId);
    this.memberGuilds.delete(memberId);

    this.broadcastGuildUpdate(guild, 'member_kicked', { id: memberId, username: member.username });

    return { success: true };
  }

  promoteToOfficer(leader: Player, memberId: string, guildId: string) {
    const guild = this.guilds.get(guildId);
    if (!guild || guild.leaderId !== leader.id) {
      return { success: false, reason: 'Not authorized' };
    }

    const member = guild.members.find(m => m.playerId === memberId);
    if (!member || member.rank === 'leader') {
      return { success: false, reason: 'Invalid member' };
    }

    member.rank = 'officer';

    this.broadcastGuildUpdate(guild, 'member_promoted', member);

    return { success: true };
  }

  demoteToMember(leader: Player, memberId: string, guildId: string) {
    const guild = this.guilds.get(guildId);
    if (!guild || guild.leaderId !== leader.id) {
      return { success: false, reason: 'Not authorized' };
    }

    const member = guild.members.find(m => m.playerId === memberId);
    if (!member || member.rank === 'leader') {
      return { success: false, reason: 'Invalid member' };
    }

    member.rank = 'member';

    this.broadcastGuildUpdate(guild, 'member_demoted', member);

    return { success: true };
  }

  contributeExp(player: Player, amount: number) {
    const guildId = this.memberGuilds.get(player.id);
    if (!guildId) return;

    const guild = this.guilds.get(guildId);
    if (!guild) return;

    const member = guild.members.find(m => m.playerId === player.id);
    if (!member) return;

    member.expContribution += amount;
    guild.exp += amount;

    // Check for guild level up
    if (guild.exp >= guild.nextExp) {
      guild.exp -= guild.nextExp;
      guild.level++;
      guild.nextExp = Math.floor(guild.nextExp * 1.5);

      this.broadcastGuildUpdate(guild, 'guild_level_up', player);
    }

    // Sync to all members
    this.broadcastGuildUpdate(guild, 'guild_contribution', player);
  }

  requestGuildInfo(playerId: string) {
    const guildId = this.memberGuilds.get(playerId);
    if (!guildId) {
      return null;
    }

    const guild = this.guilds.get(guildId);
    if (!guild) {
      return null;
    }

    return this.serializeGuild(guild);
  }

  private serializeGuild(guild: Guild): any {
    return {
      id: guild.id,
      name: guild.name,
      emblem: guild.emblem,
      leaderId: guild.leaderId,
      memberCount: guild.members.length,
      maxMembers: guild.maxMembers,
      level: guild.level,
      exp: guild.exp,
      nextExp: guild.nextExp,
      skills: guild.skills,
      members: guild.members.map(m => ({
        playerId: m.playerId,
        username: m.username,
        level: m.level,
        job: m.job,
        rank: m.rank,
        expContribution: m.expContribution
      })),
      created: guild.created
    };
  }

  private broadcastGuildUpdate(guild: Guild, eventType: string, actor: any) {
    for (const member of guild.members) {
      const player = this.gameManager.getPlayer(member.playerId);
      if (player) {
        this.sendToPlayer(player, {
          type: 'guild_event',
          eventType,
          guildId: guild.id,
          guildName: guild.name,
          actor: actor?.username || null,
          members: guild.members.map(m => m.username),
          timestamp: Date.now()
        });
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

  getPlayerGuild(playerId: string): Guild | null {
    const guildId = this.memberGuilds.get(playerId);
    if (!guildId) return null;
    return this.guilds.get(guildId) || null;
  }

  isGuildMember(playerId1: string, playerId2: string): boolean {
    const guild1 = this.memberGuilds.get(playerId1);
    const guild2 = this.memberGuilds.get(playerId2);
    return guild1 !== undefined && guild1 === guild2;
  }

  getAvailableSkills(): GuildSkill[] {
    return this.guildSkillsDB;
  }

  unlockSkill(player: Player, skillId: string, guildId: string) {
    const guild = this.guilds.get(guildId);
    if (!guild || guild.leaderId !== player.id) {
      return { success: false, reason: 'Not authorized' };
    }

    const skill = this.guildSkillsDB.find(s => s.id === skillId);
    if (!skill) {
      return { success: false, reason: 'Skill not found' };
    }

    if (guild.skills.some(s => s.id === skillId)) {
      return { success: false, reason: 'Skill already unlocked' };
    }

    guild.skills.push({ ...skill, level: 1 });

    this.broadcastGuildUpdate(guild, 'skill_unlocked', player);

    return { success: true };
  }

  upgradeSkill(player: Player, skillId: string, guildId: string) {
    const guild = this.guilds.get(guildId);
    if (!guild) {
      return { success: false, reason: 'Guild not found' };
    }

    const officer = guild.members.find(m => m.playerId === player.id);
    if (!officer || (officer.rank !== 'leader' && officer.rank !== 'officer')) {
      return { success: false, reason: 'Not authorized' };
    }

    const skillIndex = guild.skills.findIndex(s => s.id === skillId);
    if (skillIndex === -1) {
      return { success: false, reason: 'Skill not found' };
    }

    const skill = guild.skills[skillIndex];
    if (skill.level >= skill.maxLevel) {
      return { success: false, reason: 'Skill at max level' };
    }

    skill.level++;

    this.broadcastGuildUpdate(guild, 'skill_upgraded', { ...skill, player });

    return { success: true };
  }
}
