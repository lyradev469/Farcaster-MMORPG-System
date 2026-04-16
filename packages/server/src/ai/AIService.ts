/**
 * AIService - AI Agent system for autonomous gameplay
 * Handles: Agent registration, behavior parsing, action execution, skill.md loading
 */

import { GameManager } from '../core/GameManager.js';
import { Player } from '../types/player.js';

interface AgentConfig {
  id: string;
  name: string;
  token: string;
  userId: string;
  skillUrl: string;
  behavior: AgentBehavior;
  state: 'registered' | 'active' | 'paused' | 'terminated';
  actions: number;
  exp: number;
  created: number;
  lastAction: number;
}

interface AgentBehavior {
  primaryGoal: 'farm' | 'pk' | 'exp' | 'loot' | 'quest';
  riskTolerance: 0.0 | 0.25 | 0.5 | 0.75 | 1.0;
  skillPriority: string[];
  hpThreshold: number;
  spThreshold: number;
  fleeThreshold: number;
  partyWithAgents: boolean;
  guildWithAgents: boolean;
  preferredMonsters: string[];
  avoidPlayers: boolean;
}

interface AgentAction {
  type: 'move' | 'attack' | 'skill' | 'use_item' | 'auto_attack_toggle';
  targetId?: string;
  params?: any;
  timestamp: number;
}

interface RegistrationRequest {
  userId: string;
  name?: string;
  skillUrl?: string;
  behavior?: Partial<AgentBehavior>;
}

export class AIService {
  private gameManager: GameManager;
  private redis: any;
  private agents: Map<string, AgentConfig> = new Map();
  private agentTokens: Map<string, string> = new Map(); // token -> agentId
  private actionQueue: AgentAction[] = [];

  constructor(gameManager: GameManager, redis: any) {
    this.gameManager = gameManager;
    this.redis = redis;
  }

  async registerAgent(request: RegistrationRequest): Promise<{ success: boolean; agentId?: string; token?: string; error?: string }> {
    const agentId = `agent_${Date.now()}_${request.userId}`;
    const token = crypto.randomUUID();

    const defaultBehavior: AgentBehavior = {
      primaryGoal: request.behavior?.primaryGoal || 'exp',
      riskTolerance: request.behavior?.riskTolerance || 0.5,
      skillPriority: request.behavior?.skillPriority || ['attack', 'heal'],
      hpThreshold: request.behavior?.hpThreshold || 0.3,
      spThreshold: request.behavior?.spThreshold || 0.2,
      fleeThreshold: request.behavior?.fleeThreshold || 0.15,
      partyWithAgents: request.behavior?.partyWithAgents || true,
      guildWithAgents: request.behavior?.guildWithAgents || false,
      preferredMonsters: request.behavior?.preferredMonsters || [],
      avoidPlayers: request.behavior?.avoidPlayers || false
    };

    // Load skill.md if provided
    let behavior = defaultBehavior;
    if (request.skillUrl) {
      try {
        const response = await fetch(request.skillUrl);
        if (response.ok) {
          const skillMd = await response.text();
          behavior = this.parseSkillMd(skillMd, defaultBehavior);
        }
      } catch (err) {
        console.log(`[AI] Failed to load skill.md for agent ${agentId}:`, err);
      }
    }

    const agent: AgentConfig = {
      id: agentId,
      name: request.name || `Agent-${request.userId.slice(0, 8)}`,
      token,
      userId: request.userId,
      skillUrl: request.skillUrl || '',
      behavior,
      state: 'registered',
      actions: 0,
      exp: 0,
      created: Date.now(),
      lastAction: Date.now()
    };

    this.agents.set(agentId, agent);
    this.agentTokens.set(token, agentId);

    // Store in Redis for persistence
    await this.redis.hset(`agent:${agentId}`, {
      name: agent.name,
      userId: agent.userId,
      behavior: JSON.stringify(agent.behavior),
      state: agent.state,
      created: agent.created
    });

    return { success: true, agentId, token };
  }

  private parseSkillMd(skillMd: string, defaults: AgentBehavior): AgentBehavior {
    // Parse skill.md content
    const behavior = { ...defaults };

    // Extract primary goal
    const goalMatch = skillMd.match(/primary_goal:\s*(\w+)/i);
    if (goalMatch) behavior.primaryGoal = goalMatch[1] as any;

    // Extract risk tolerance
    const riskMatch = skillMd.match(/risk_tolerance:\s*([\d.]+)/i);
    if (riskMatch) behavior.riskTolerance = parseFloat(riskMatch[1]) as any;

    // Extract HP threshold
    const hpMatch = skillMd.match(/hp_threshold:\s*([\d.]+)/i);
    if (hpMatch) behavior.hpThreshold = parseFloat(hpMatch[1]);

    // Extract flee threshold
    const fleeMatch = skillMd.match(/flee_threshold:\s*([\d.]+)/i);
    if (fleeMatch) behavior.fleeThreshold = parseFloat(fleeMatch[1]);

    // Extract skill priorities
    const skillMatch = skillMd.match(/skill_priority:\s*\[(.*)\]/i);
    if (skillMatch) {
      behavior.skillPriority = skillMatch[1].split(',').map(s => s.trim().replace(/["']/g, ''));
    }

    // Extract preferred monsters
    const monsterMatch = skillMd.match(/preferred_monsters:\s*\[(.*)\]/i);
    if (monsterMatch) {
      behavior.preferredMonsters = monsterMatch[1].split(',').map(s => s.trim().replace(/["']/g, ''));
    }

    // Extract social behaviors
    behavior.partyWithAgents = skillMd.includes('party_with_agents: true');
    behavior.guildWithAgents = skillMd.includes('guild_with_agents: true');
    behavior.avoidPlayers = skillMd.includes('avoid_players: true');

    return behavior;
  }

  async authenticateAgent(token: string): Promise<AgentConfig | null> {
    const agentId = this.agentTokens.get(token);
    if (!agentId) return null;

    const agent = this.agents.get(agentId);
    if (!agent || agent.state !== 'registered') return null;

    return agent;
  }

  async processAgents(now: number) {
    // Process each active agent
    for (const agent of this.agents.values()) {
      if (agent.state !== 'registered') continue;

      // Throttle actions (max 2 actions per second per agent)
      if (now - agent.lastAction < 500) continue;

      try {
        await this.executeAgentBehavior(agent, now);
      } catch (err) {
        console.log(`[AI] Error processing agent ${agent.id}:`, err);
      }
    }
  }

  private async executeAgentBehavior(agent: AgentConfig, now: number) {
    // Find nearest target based on behavior
    const target = await this.findTarget(agent);
    if (!target) {
      // No target, explore
      this.executeExplore(agent);
      return;
    }

    const distance = this.getDistance(agent, target);

    // Check HP thresholds
    const player = this.gameManager.getPlayer(agent.id);
    if (!player) {
      // Agent not logged in, try to auto-login
      await this.autoLoginAgent(agent);
      return;
    }

    const hpPercent = player.hp / player.maxHp;

    // Flee if low HP
    if (hpPercent < agent.behavior.fleeThreshold) {
      this.executeFlee(agent, player);
      return;
    }

    // Heal if below threshold
    if (hpPercent < agent.behavior.hpThreshold) {
      this.executeHeal(agent, player);
      return;
    }

    // Engage if in range
    if (distance < 100) {
      this.executeAttack(agent, player, target);
    } else {
      // Move towards target
      this.executeMove(agent, player, target.position);
    }

    agent.lastAction = now;
  }

  private async findTarget(agent: AgentConfig): Promise<Entity | Player | null> {
    const behavior = agent.behavior;

    if (behavior.primaryGoal === 'farm' || behavior.primaryGoal === 'exp') {
      // Find nearest monster
      let nearest: Entity | null = null;
      let nearestDist = Infinity;

      for (const [id, entity] of this.gameManager['_entities']) {
        if (entity.type === 'monster') {
          const dist = this.getDistance(agent, entity);
          if (dist < nearestDist && dist < 1000) {
            // Check preferred monsters
            if (behavior.preferredMonsters.length > 0 && 
                !behavior.preferredMonsters.includes(entity.name)) {
              continue;
            }
            nearest = entity;
            nearestDist = dist;
          }
        }
      }

      return nearest;
    } else if (behavior.primaryGoal === 'pk' && behavior.avoidPlayers === false) {
      // Find nearest player
      let nearest: Player | null = null;
      let nearestDist = Infinity;

      for (const player of this.gameManager['_players'].values()) {
        if (player.id === agent.id) continue;

        const dist = this.getDistance(agent, player);
        if (dist < nearestDist && dist < 1000) {
          nearest = player;
          nearestDist = dist;
        }
      }

      return nearest;
    }

    return null;
  }

  private executeExplore(agent: AgentConfig) {
    const player = this.gameManager.getPlayer(agent.id);
    if (!player) return;

    // Random movement
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 100;
    const newX = player.position.x + Math.cos(angle) * distance;
    const newY = player.position.y + Math.sin(angle) * distance;

    player.position.x = Math.max(0, Math.min(newX, 3200));
    player.position.y = Math.max(0, Math.min(newY, 3200));
    player.state = 'moving';

    this.recordAction(agent, { type: 'move', params: { x: player.position.x, y: player.position.y } });
  }

  private executeMove(agent: AgentConfig, player: Player, targetPos: { x: number; y: number }) {
    const angle = Math.atan2(targetPos.y - player.position.y, targetPos.x - player.position.x);
    const distance = 50;

    player.position.x += Math.cos(angle) * distance;
    player.position.y += Math.sin(angle) * distance;
    player.state = 'moving';

    this.recordAction(agent, { type: 'move', params: player.position });
  }

  private executeAttack(agent: AgentConfig, player: Player, target: Entity | Player) {
    const combat = this.gameManager['_combat'];
    const result = combat.handleAttack(player, target.id);

    if (result.success) {
      this.recordAction(agent, { 
        type: 'attack', 
        targetId: target.id,
        damage: result.damage 
      });
    }
  }

  private executeHeal(agent: AgentConfig, player: Player) {
    const skills = this.gameManager['_skills'];
    skills.handleSkillCast(player, 'heal', player.id);

    this.recordAction(agent, { type: 'skill', skillId: 'heal' });
  }

  private executeFlee(agent: AgentConfig, player: Player) {
    // Move away from combat
    const angle = Math.random() * Math.PI * 2;
    const distance = 200;
    player.position.x += Math.cos(angle) * distance;
    player.position.y += Math.sin(angle) * distance;
    player.state = 'moving';

    this.recordAction(agent, { type: 'flee' });
  }

  private async autoLoginAgent(agent: AgentConfig) {
    // Auto-login agent to the game
    const mockClient = {
      ws: {
        send: () => {},
        readyState: 1
      }
    };

    this.gameManager.addClient(agent.id, mockClient as any);
    
    await this.gameManager.handleMessage(agent.id, {
      type: 'login',
      data: {
        username: agent.id,
        walletAddress: `0x${agent.id.slice(0, 40)}`
      }
    });

    const player = this.gameManager.getPlayer(agent.id);
    if (player) {
      agent.state = 'active';
    }
  }

  private recordAction(agent: AgentConfig, action: AgentAction) {
    agent.actions++;
    action.timestamp = Date.now();
    this.actionQueue.push(action);

    // Keep last 1000 actions
    if (this.actionQueue.length > 1000) {
      this.actionQueue.shift();
    }

    // Update Redis
    this.redis.hincrby(`agent:${agent.id}`, 'actions', 1);
  }

  private getDistance(from: { position: { x: number; y: number } }, to: { position: { x: number; y: number } }): number {
    const dx = from.position.x - to.position.x;
    const dy = from.position.y - to.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // HTTP API handlers
  async handleAPI(endpoint: string, method: string, body: any, token?: string): Promise<any> {
    if (endpoint === '/agent/register' && method === 'POST') {
      return this.registerAgent(body);
    }

    if (endpoint === '/agent/status' && method === 'GET') {
      if (!token) return { error: 'Unauthorized' };
      const agent = await this.authenticateAgent(token);
      return agent ? { agentId: agent.id, state: agent.state, actions: agent.actions } : { error: 'Not found' };
    }

    if (endpoint.startsWith('/action/') && method === 'POST') {
      if (!token) return { error: 'Unauthorized' };
      const agent = await this.authenticateAgent(token);
      if (!agent) return { error: 'Invalid token' };

      const actionType = endpoint.split('/')[2];
      const player = this.gameManager.getPlayer(agent.id);
      
      if (!player) {
        await this.autoLoginAgent(agent);
      }

      switch (actionType) {
        case 'move':
          if (player) this.executeMove(agent, player, body);
          return { success: true };
        case 'attack':
          if (player) {
            const target = this.gameManager.getEntity(body.targetId) || this.gameManager.getPlayer(body.targetId);
            if (target) this.executeAttack(agent, player, target);
          }
          return { success: true };
        case 'skill':
          if (player) {
            const skills = this.gameManager['_skills'];
            skills.handleSkillCast(player, body.skillId, body.targetId);
          }
          return { success: true };
        default:
          return { error: 'Unknown action' };
      }
    }

    if (endpoint === '/state' && method === 'GET') {
      if (!token) return { error: 'Unauthorized' };
      const agent = await this.authenticateAgent(token);
      if (!agent) return { error: 'Invalid token' };

      const player = this.gameManager.getPlayer(agent.id);
      return player ? this.gameManager.serializePlayer(player) : { error: 'Not logged in' };
    }

    if (endpoint === '/world/nearby' && method === 'GET') {
      if (!token) return { error: 'Unauthorized' };
      const agent = await this.authenticateAgent(token);
      if (!agent) return { error: 'Invalid token' };

      const player = this.gameManager.getPlayer(agent.id);
      if (!player) return { error: 'Not logged in' };

      return this.gameManager.getWorldSnapshot(player);
    }

    if (endpoint === '/combat/log' && method === 'GET') {
      if (!token) return { error: 'Unauthorized' };
      const agent = await this.authenticateAgent(token);
      if (!agent) return { error: 'Invalid token' };

      const combat = this.gameManager['_combat'];
      return { logs: combat.getCombatLogs(agent.id) };
    }

    return { error: 'Not found' };
  }

  getAgentStats(agentId: string): any {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    return {
      id: agent.id,
      name: agent.name,
      state: agent.state,
      actions: agent.actions,
      exp: agent.exp,
      behavior: agent.behavior,
      created: agent.created,
      lastAction: agent.lastAction
    };
  }

  listAgents(): any[] {
    return Array.from(this.agents.values()).map(agent => ({
      id: agent.id,
      name: agent.name,
      state: agent.state,
      actions: agent.actions,
      exp: agent.exp,
      created: agent.created
    }));
  }

  pauseAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.state = 'paused';
    return true;
  }

  resumeAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.state = 'registered';
    return true;
  }

  terminateAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.state = 'terminated';
    this.agents.delete(agentId);
    return true;
  }
}
