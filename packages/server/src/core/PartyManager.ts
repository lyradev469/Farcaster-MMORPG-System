/**
 * PartyManager - Party system for cooperative gameplay
 * Handles: Party creation, management, EXP sharing, loot distribution
 */

import { Player } from '../types/player.js';
import { GameManager } from './GameManager.js';

interface PartyMember {
  playerId: string;
  username: string;
  level: number;
  hp: number;
  maxHp: number;
  position: { x: number; y: number; zone: string };
  isLeader: boolean;
}

interface Party {
  id: string;
  name: string;
  leaderId: string;
  members: PartyMember[];
  maxMembers: number;
  expSharing: boolean;
  lootSharing: 'personal' | 'round_robin' | 'need_first' | 'master_looter';
  masterLooter?: string;
  created: number;
}

export class PartyManager {
  private gameManager: GameManager;
  private parties: Map<string, Party> = new Map();
  private memberParties: Map<string, string> = new Map(); // playerId -> partyId

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  createParty(leader: Player, name: string): Party | null {
    if (this.memberParties.has(leader.id)) {
      return null; // Already in a party
    }

    const partyId = `party_${Date.now()}_${leader.id}`;
    const party: Party = {
      id: partyId,
      name,
      leaderId: leader.id,
      members: [{
        playerId: leader.id,
        username: leader.username,
        level: leader.level,
        hp: leader.hp,
        maxHp: leader.maxHp,
        position: leader.position,
        isLeader: true
      }],
      maxMembers: 6,
      expSharing: true,
      lootSharing: 'personal',
      created: Date.now()
    };

    this.parties.set(partyId, party);
    this.memberParties.set(leader.id, partyId);

    this.broadcastPartyUpdate(party, 'party_created');

    return party;
  }

  handleInvite(inviter: Player, targetId: string) {
    const target = this.gameManager.getPlayer(targetId);
    if (!target) {
      return { success: false, reason: 'Player not found' };
    }

    if (this.memberParties.has(target.id)) {
      return { success: false, reason: 'Already in a party' };
    }

    // Check inviter's party
    const inviterPartyId = this.memberParties.get(inviter.id);
    let party: Party | undefined;

    if (inviterPartyId) {
      party = this.parties.get(inviterPartyId);
    } else {
      // Create new party for inviter
      party = this.createParty(inviter, `${inviter.username}'s Party`);
      if (!party) {
        return { success: false, reason: 'Failed to create party' };
      }
    }

    if (party.members.length >= party.maxMembers) {
      return { success: false, reason: 'Party is full' };
    }

    // Send invite to target
    this.sendToPlayer(target, {
      type: 'party_invite',
      fromPlayer: inviter.username,
      partyId: party.id,
      partyName: party.name
    });

    return { success: true, partyId: party.id };
  }

  handleAccept(player: Player, partyId: string) {
    const party = this.parties.get(partyId);
    if (!party) {
      return { success: false, reason: 'Party not found' };
    }

    if (party.members.length >= party.maxMembers) {
      return { success: false, reason: 'Party is full' };
    }

    // Add player to party
    party.members.push({
      playerId: player.id,
      username: player.username,
      level: player.level,
      hp: player.hp,
      maxHp: player.maxHp,
      position: player.position,
      isLeader: false
    });

    this.memberParties.set(player.id, partyId);

    this.broadcastPartyUpdate(party, 'member_joined', player);
    this.updatePartyMembers(party);

    return { success: true };
  }

  handleDecline(player: Player, partyId: string) {
    this.sendToPlayer(player, {
      type: 'party_invite_declined',
      partyId
    });
  }

  handleLeave(player: Player) {
    const partyId = this.memberParties.get(player.id);
    if (!partyId) return;

    const party = this.parties.get(partyId);
    if (!party) return;

    // Remove member
    party.members = party.members.filter(m => m.playerId !== player.id);
    this.memberParties.delete(player.id);

    // Check if party should be dissolved
    if (party.members.length === 0) {
      this.parties.delete(partyId);
      this.broadcastPartyUpdate(party, 'party_dissolved');
    } else if (player.id === party.leaderId) {
      // Transfer leadership
      const newLeader = party.members[0];
      party.leaderId = newLeader.playerId;
      newLeader.isLeader = true;
      
      this.broadcastPartyUpdate(party, 'leader_changed', player);
    } else {
      this.broadcastPartyUpdate(party, 'member_left', player);
    }
  }

  handleKick(leader: Player, memberId: string) {
    const partyId = this.memberParties.get(leader.id);
    if (!partyId) return { success: false, reason: 'Not in a party' };

    const party = this.parties.get(partyId);
    if (!party || party.leaderId !== leader.id) {
      return { success: false, reason: 'Not the leader' };
    }

    const member = party.members.find(m => m.playerId === memberId);
    if (!member) {
      return { success: false, reason: 'Member not found' };
    }

    if (memberId === leader.id) {
      return { success: false, reason: 'Cannot kick yourself' };
    }

    // Remove member
    party.members = party.members.filter(m => m.playerId !== memberId);
    this.memberParties.delete(memberId);

    this.broadcastPartyUpdate(party, 'member_kicked', member);

    return { success: true };
  }

  distributeExp(killer: Player, exp: number) {
    const partyId = this.memberParties.get(killer.id);
    if (!partyId) {
      // Solo kill
      killer.exp += exp;
      return;
    }

    const party = this.parties.get(partyId);
    if (!party || !party.expSharing) {
      killer.exp += exp;
      return;
    }

    // Calculate distance-based sharing
    const eligibleMembers = party.members.filter(member => {
      const player = this.gameManager.getPlayer(member.playerId);
      if (!player) return false;

      const distance = this.getDistance(killer.position, player.position);
      return distance < 1000; // Within 1000 units
    });

    if (eligibleMembers.length === 0) {
      killer.exp += exp;
      return;
    }

    // Share EXP based on level difference (Ragnarok formula)
    let totalLevel = 0;
    for (const member of eligibleMembers) {
      const player = this.gameManager.getPlayer(member.playerId);
      if (player) totalLevel += player.level;
    }

    for (const member of eligibleMembers) {
      const player = this.gameManager.getPlayer(member.playerId);
      if (!player) continue;

      const memberLevel = player.level;
      const share = Math.floor(exp * (memberLevel / totalLevel));
      player.exp += share;

      // Check for level up
      if (player.exp >= player.nextExp) {
        this.checkLevelUp(player);
      }
    }
  }

  private checkLevelUp(player: Player) {
    player.exp -= player.nextExp;
    player.level++;
    player.nextExp = Math.floor(player.nextExp * 1.5);

    // Stat increase
    player.stats.str += 2;
    player.stats.agi += 2;
    player.stats.vit += 2;
    player.stats.int += 2;
    player.stats.dex += 2;
    player.stats.luk += 1;

    player.maxHp = Math.floor(player.maxHp * 1.1);
    player.maxSp = Math.floor(player.maxSp * 1.1);
    player.hp = player.maxHp;
    player.sp = player.maxSp;

    this.sendToPlayer(player, {
      type: 'level_up',
      level: player.level,
      stats: player.stats,
      maxHp: player.maxHp
    });

    // Update party
    const partyId = this.memberParties.get(player.id);
    if (partyId) {
      const party = this.parties.get(partyId);
      if (party) {
        const member = party.members.find(m => m.playerId === player.id);
        if (member) {
          member.level = player.level;
          member.hp = player.hp;
          member.maxHp = player.maxHp;
        }
        this.broadcastPartyUpdate(party, 'member_level_up', player);
      }
    }
  }

  private updatePartyMembers(party: Party) {
    for (const member of party.members) {
      const player = this.gameManager.getPlayer(member.playerId);
      if (player) {
        this.sendToPlayer(player, {
          type: 'party_update',
          partyId: party.id,
          members: party.members
        });
      }
    }
  }

  private broadcastPartyUpdate(party: Party, eventType: string, actor?: any) {
    for (const member of party.members) {
      const player = this.gameManager.getPlayer(member.playerId);
      if (player) {
        this.sendToPlayer(player, {
          type: 'party_event',
          eventType,
          partyId: party.id,
          partyName: party.name,
          actor: actor?.username || null,
          members: party.members,
          timestamp: Date.now()
        });
      }
    }
  }

  getPlayerParty(playerId: string): Party | null {
    const partyId = this.memberParties.get(playerId);
    if (!partyId) return null;
    return this.parties.get(partyId) || null;
  }

  isPartyMember(playerId1: string, playerId2: string): boolean {
    const party1 = this.memberParties.get(playerId1);
    const party2 = this.memberParties.get(playerId2);
    return party1 !== undefined && party1 === party2;
  }

  private sendToPlayer(player: Player, packet: any) {
    const client = Array.from(this.gameManager['_clients'].values())
      .find(c => c.player?.id === player.id);
    
    if (client?.ws.readyState === 1) {
      client.ws.send(JSON.stringify(packet));
    }
  }

  private getDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
