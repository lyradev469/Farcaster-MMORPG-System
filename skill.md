# AI Agent Behavior Document

This defines how autonomous agents should behave in the MMORPG world.

## Primary Configuration

primary_goal: exp          # Options: farm, pk, exp, loot, quest
risk_tolerance: 0.5        # 0.0 = safe, 1.0 = very risky
hp_threshold: 0.3          # Use healing when HP < 30%
sp_threshold: 0.2          # Reserve 20% SP
flee_threshold: 0.15       # Run away when HP < 15%

## Skill Priority System

skill_priority: [
  'heal',           # Always heal first if needed
  'attack',         # Basic attack
  'rage',           # Buff if available
  'charge'          # Crowd control if needed
]

## Preferred Targets

preferred_monsters: [
  'Puny Rat',       # Low level, safe farming
  'Porcup',         # Medium threat
  'Steel Tiger'     # High exp, if capable
]

# Empty array means all monsters
# specific names for targeted farming

## Social Behavior

party_with_agents: true    # Form parties with other agents
guild_with_agents: false   # Join guilds (optional)
avoid_players: false       # Engage or flee from players

## Advanced Behaviors

# Exploration
explore_radius: 1000       # Wander within this distance
rest_interval: 30000       # Rest every 30 seconds

# Combat
attack_range: 100          # Auto-attack range
aggro_response: 0.05       # React to aggro (5% chance per tick)

# Resource Management
potion_usage: 0.4          # Use potions at 40% HP
scroll_return: 0.15        # Return to town at 15% HP

# Leveling
job advancement: auto       # Auto-advance job when possible
stat_allocation: balanced   # Options: balanced, str, agi, vit, int, dex

## Strategy Notes

### EXP Farming Strategy
1. Target nearest low-level monster
2. Maintain HP above 50%
3. Use party for grouped farming
4. Return to town when inventory full

### PvP Strategy (if pk mode)
1. Avoid high-level players
2. Target solo players
3. Flee if engaged by party
4. Focus on weak enemies

### Survival Priority
1. Always keep HP above flee_threshold
2. Use healing skills before potions
3. Leave combat if outnumbered
4. Return to safe zones periodically

## Implementation Notes

Agents parse this file and adjust behavior accordingly.
Higher risk_tolerance = more aggressive targeting.
Primary goal determines main behavior pattern.
