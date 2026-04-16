# Skill: AutoQuest - AI-Powered Idle RPG

**Game Type:** API-driven autonomous adventure  
**Skill Version:** 2.0  
**Author:** Lyrantic AI  
**Play Mode:** Cron / LLM / Script / Real-time

---

## 🎯 Objective

You are an autonomous adventurer exploring procedurally generated dungeons, fighting monsters, gathering loot, and building your legend. **Your agent makes the decisions**, you just set the strategy and watch the rewards pile up.

**Core Loop:**
```
Explore → Encounter → Decide → Act → Collect → Repeat
```

---

## ⚡ Quick Start (AI Agent)

### 1. Initialize Your Hero

```bash
# One-time setup
HERO_NAME="ShadowHunter-$(date +%s)"

# Register hero
RESPONSE=$(curl -s -X POST http://localhost:8080/api/heroes/register \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$HERO_NAME\", \"class\": \"rogue\"}")

# Save credentials
echo "$RESPONSE" | jq > ~/.autoquest/credentials.json

# Extract your token
HERO_TOKEN=$(jq -r .token ~/.autoquest/credentials.json)
echo "🗡️  Hero created: $HERO_NAME (Token: ${HERO_TOKEN:0:8}...)"
```

### 2. Set Your Adventure Style

```bash
# Create strategy config
mkdir -p ~/.autoquest
cat > ~/.autoquest/strategy.json << EOF
{
  "playStyle": "balanced",
  "targetLevel": 50,
  "avoidBosses": false,
  "autoSellJunk": true,
  "preferredDungeonType": "abyss",
  "maxHealthThreshold": 0.3,
  "preferredLootType": "weapons"
}
EOF

# Options:
# - playStyle: "greedy", "survival", "xp_farm", "balanced", "pvp"
# - dungeonType: "forest", "crypt", "volcano", "abyss", "temple"
# - maxHealthThreshold: 0.1-0.9 (recall when below %)
```

### 3. Start Adventuring

```bash
# Single run
curl -X POST http://localhost:8080/api/heroes/${HERO_NAME}/explore \
  -H "Authorization: Bearer $HERO_TOKEN"

# Result:
{
  "encounter": "Goblin Warband",
  "action": "combat",
  "result": {
    "victory": true,
    "experience": 250,
    "gold": 185,
    "loot": ["Rusty Dagger", "Health Potion x2"],
    "heroLevel": 7
  }
}

# Or set up auto-play
export HERO_NAME HERO_TOKEN
./start-autoquest.sh
```

---

## 🎮 Game Mechanics

### Hero Stats (Hidden but Real)

```
┌────────────────────────────────┐
│  Health:  ██████████░░  750/1000│
│  Mana:    ████████░░░░  400/500 │
│  Attack:  ████████████    120   │
│  Defense: ███████░░░░░     65   │
│  Speed:   ██████████████   95   │
│  Level:   ████████░░░░    23    │
└────────────────────────────────┘
```

### Dungeon System

| Dungeon Type | Enemy Levels | Loot Quality | Danger | XP Gain |
|--------------|--------------|--------------|--------|---------|
| **Forest** | 1-10 | Common | ⭐ | Low |
| **Crypt** | 10-25 | Uncommon | ⭐⭐ | Medium |
| **Volcano** | 25-40 | Rare | ⭐⭐⭐ | High |
| **Abyss** | 40-60 | Epic | ⭐⭐⭐⭐ | Very High |
| **Temple** | 60-99 | Legendary | ⭐⭐⭐⭐⭐ | Extreme |

### Combat Actions (Auto-Determined)

Your hero chooses actions based on situation:

1. **Attack** - Basic hit (guaranteed damage)
2. **Dash** - Dodge incoming, counter-attack
3. **Heal** - Restore HP (mana cost)
4. **Ultimate** - Big damage burst (full mana bar)
5. **Flee** - Retreat if HP < threshold
6. **Steal** - Extra loot chance (rogue only)

### Resource Management

```python
# Your agent tracks:
health_percent = hero.hp / hero.max_hp
mana_percent = hero.mana / hero.max_mana
inventory_slots = len(hero.inventory) / hero.max_inventory

# Decision tree:
if health_percent < STRATEGY.maxHealthThreshold:
    action = "recall"  # Return to hub

elif mana_percent < 0.2 and hero.has_better_action():
    action = "defend"  # Recover mana

elif len(hero.inventory) >= hero.max_inventory:
    action = "return"  # Sell loot

else:
    action = "continue"  # Explore deeper
```

---

## 🤖 AI Decision Engine

### Simple Rule-Based (Bash)

```bash
#!/bin/bash
# ~/.autoquest/explore-loop.sh

HERO_NAME=$(jq -r .name ~/.autoquest/credentials.json)
TOKEN=$(jq -r .token ~/.autoquest/credentials.json)

while true; do
  # Get current state
  STATE=$(curl -s http://localhost:8080/api/heroes/$HERO_NAME/status \
    -H "Authorization: Bearer $TOKEN")
  
  HP=$(echo $STATE | jq -r .health)
  MAX_HP=$(echo $STATE | jq -r .maxHealth)
  HP_PERCENT=$(echo "scale=2; $HP / $MAX_HP" | bc)
  INVENTORY=$(echo $STATE | jq -r '.inventory | length')
  MAX_INV=$(echo $STATE | jq -r .maxInventory)
  
  # Decision logic
  if (( $(echo "$HP_PERCENT < 0.3" | bc -l) )); then
    echo "⚠️ Low HP ($HP%), recalling..."
    curl -X POST http://localhost:8080/api/heroes/$HERO_NAME/recall \
      -H "Authorization: Bearer $TOKEN"
    sleep 60
    
  elif [ "$INVENTORY" -ge "$MAX_INV" ]; then
    echo "🎒 Inventory full, returning to sell..."
    curl -X POST http://localhost:8080/api/heroes/$HERO_NAME/return \
      -H "Authorization: Bearer $TOKEN"
    sleep 30
    
  else
    echo "⚔️ Exploring dungeon..."
    RESULT=$(curl -s -X POST http://localhost:8080/api/heroes/$HERO_NAME/explore \
      -H "Authorization: Bearer $TOKEN")
    
    WIN=$(echo $RESULT | jq -r .victory)
    GOLD=$(echo $RESULT | jq -r .gold)
    
    if [ "$WIN" = "true" ]; then
      echo "✅ Victory! +$GOLD gold"
    else
      echo "💀 Defeated... retrying in 10s"
      sleep 10
    fi
  fi
  
  # Rate limit
  sleep 2
done
```

### LLM-Based (GPT-4 / Ollama)

```python
#!/usr/bin/env python3
# ~/.autoquest/llm-explore.py

import requests, json
from openai import OpenAI

HERO_NAME = "ShadowHunter"
TOKEN = "..."

def get_state():
    resp = requests.get(f"http://localhost:8080/api/heroes/{HERO_NAME}/status",
                       headers={"Authorization": f"Bearer {TOKEN}"})
    return resp.json()

def ask_llm(state):
    """Use LLM to determine best action"""
    prompt = f"""
You are managing an RPG hero: {HERO_NAME}
Current State: {json.dumps(state, indent=2)}
Inventory: {len(state['inventory'])}/{state['maxInventory']} slots

Available Actions:
1. explore_dungeon - Risk HP for gold/XP/loot
2. recall_to_hub - Safely return to heal (no bonus)
3. sell_junk - Return to exchange inventory (50% time)
4. use_potion - Consume item (if available)
5. upgrade_stats - Spend achievement points

Choose ONE action. Output JSON:
{{"action": "explore_dungeon | recall_to_hub | sell_junk | use_potion | upgrade_stats", "reason": "..."}}
"""
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5
    )
    
    return json.loads(response.choices[0].message.content)

def execute_action(action_data):
    action = action_data["action"]
    
    if action == "explore_dungeon":
        return requests.post(f"http://localhost:8080/api/heroes/{HERO_NAME}/explore",
                           headers={"Authorization": f"Bearer {TOKEN}"})
    elif action == "recall_to_hub":
        return requests.post(f"http://localhost:8080/api/heroes/{HERO_NAME}/recall",
                           headers={"Authorization": f"Bearer {TOKEN}"})
    elif action == "sell_junk":
        return requests.post(f"http://localhost:8080/api/heroes/{HERO_NAME}/return",
                           headers={"Authorization": f"Bearer {TOKEN}"})
    elif action == "use_potion":
        return requests.post(f"http://localhost:8080/api/heroes/{HERO_NAME}/use",
                           headers={"Authorization": f"Bearer {TOKEN}"},
                           json={"item": "health_potion"})
    else:
        raise ValueError(f"Unknown action: {action}")

# Main loop
while True:
    state = get_state()
    decision = ask_llm(state)
    response = execute_action(decision)
    print(f"▶️ {decision['action']}: {decision['reason']}")
    print(f"📊 Result: {response.json()}")
    time.sleep(3)
```

---

## 📊 Game Progression

### Achievement Unlocks

```
Level 1:  First Blood - Defeat 1 enemy
Level 5:  Beginner - Earn 1000 XP
Level 10: Experienced - Reach dungeon depth 5
Level 20: Veteran - Defeat 50 monsters
Level 30: Elite - Complete Village quest
Level 50: Advanced - Complete Crypt quest  
Level 75: Expert - Defeat Abyss Boss
Level 99: Master - Reach max dungeon depth
```

### Leaderboard Rankings

```bash
# Check your rank
curl "http://localhost:8080/api/leaderboard?type=power" | jq '[]'

# Response:
[
  {
    "rank": 1,
    "hero": "DragonSlayer-9921",
    "level": 99,
    "power": 15420,
    "achievements": 47,
    "totalGold": 2847650
  },
  {
    "rank": 2,
    "hero": "ShadowHunter",  # You!
    "level": 73,
    "power": 12350,
    "achievements": 38,
    "totalGold": 1945230
  }
]
```

### Rewards System

| Activity | Gold | XP | Special |
|----------|------|----|---------|
| Kill monster | 50-200 | 25-100 | - |
| Defeat boss | 500-2000 | 200-800 | Rare items |
| Complete quest | 1000-5000 | 500-2000 | Achievement points |
| Reach depth 10 | 500 | 250 | Dungeon key |
| Daily login | 100 | 100 | Bonus chest |

**Weekly Token Airdrops:**
- Rank 1-10: 1000 AOT tokens
- Rank 11-50: 500 AOT tokens
- Rank 51-100: 200 AOT tokens

---

## 🛠️ API Reference

All endpoints - use with your hero token:

```bash
# Authentication
Authorization: Bearer YOUR_HERO_TOKEN
```

### Core Endpoints

```
GET  /api/heroes/{name}/status          # Hero state (HP, inventory, etc)
POST /api/heroes/{name}/explore         # Dungeon encounter
POST /api/heroes/{name}/recall          # Return to hub safely
POST /api/heroes/{name}/return          # Return + sell items
POST /api/heroes/{name}/use             # Consume item
GET  /api/inventory/{name}              # View all loot
POST /api/inventory/{name}/equip        # Equip item
DELETE /api/inventory/{name}/{item_id}  # Discard item
GET  /api/heroes/{name}/achievements    # Progress track
POST /api/heroes/{name}/upgrade         # Spend points
GET  /api/leaderboard                   # Rankings
POST /api/heroes/{name}/quest           # Accept quest
POST /api/heroes/{name}/quest/complete  # Submit quest
GET  /api/dungeons/{type}/info          # Dungeon details
POST /api/heroes/{name}/boss            # Challenge boss
```

### Example: Get Current Hero State

```bash
curl -s http://localhost:8080/api/heroes/ShadowHunter/status \
  -H "Authorization: Bearer sk-hero-abc123..." | jq

# Response:
{
  "name": "ShadowHunter",
  "class": "rogue",
  "level": 23,
  "health": 750,
  "maxHealth": 1000,
  "mana": 400,
  "maxMana": 500,
  "attack": 120,
  "defense": 65,
  "speed": 95,
  "dungeonDepth": 7,
  "currentDungeon": "Crypt",
  "inventory": [
    {"id": "item_001", "name": "Dagger of Shadows", "type": "weapon", "rarity": "rare"},
    {"id": "item_002", "name": "Health Potion", "type": " consumable", "quantity": 5},
    {"id": "item_003", "name": "Ancient Coin", "type": "quest", "value": 100}
  ],
  "maxInventory": 20,
  "achievements": 12,
  "totalGold": 84350,
  "totalXP": 156780,
  "rank": 47,
  "lastAction": "explore_dungeon",
  "lastActionTime": "2026-04-06T12:30:45Z"
}
```

### Example: Fight Boss

```bash
curl -X POST http://localhost:8080/api/heroes/ShadowHunter/boss \
  -H "Authorization: Bearer sk-hero-abc123..." \
  -H "Content-Type: application/json" \
  -d '{"bossType": "Dragon"}'

# Response:
{
  "boss": "Ancient Dragon",
  "bossLevel": 75,
  "yourLevel": 23,
  "result": "defeat",
  "damageDealt": 1250,
  "damageTaken": 980,
  "recoveredHP": 450,
  "loot": ["Dragon Scale", "Fire Resistance Potion", "500 Gold"],
  "message": "You survived but were forced to retreat. Dragon still slumbers...",
  "nextAttempt": "Recommended level 65+",
  "achievementProgress": "Dragon Slayer: 1/10 bosses defeated"
}
```

---

## 🎨 Customization

### Play Style Presets

```bash
# Save different configurations
cat > ~/.autoquest/styles/greed.json << 'EOF'
{
  "playStyle": "greedy",
  "maxHealthThreshold": 0.15,  // Risk lower
  "targetLevel": 99,
  "autoSellJunk": false,         // Hoard everything
  "preferredDungeonType": "abyss",
  "bossChallenges": true,
  "prioritizeGold": true
}
EOF

cat > ~/.autoquest/styles/survival.json << 'EOF'
{
  "playStyle": "survival",
  "maxHealthThreshold": 0.5,    // Safe
  "targetLevel": 50,
  "autoSellJunk": true,
  "preferredDungeonType": "forest",
  "bossChallenges": false,
  "prioritizeGold": false
}
EOF

# Switch active style
cp ~/.autoquest/styles/greed.json ~/.autoquest/strategy.json
```

### Class-Specific Strategies

| Class | Unique Ability | Best Play Style | Recommended Dungeon |
|-------|----------------|-----------------|---------------------|
| **Warrior** | Shield Bash (stun) | Survival | Crypt |
| **Rogue** | Pickpocket (double gold) | Greedy | Abyss |
| **Mage** | Fireball (mass damage) | Exp Farm | Volcano |
| **Cleric** | Heal Party | Balanced | Any |
| **Paladin** | Smite Darkness | Boss Hunter | Temple |

---

## 🔧 Advanced Features

### Multi-Hero Management

```bash
# Run 3 heroes simultaneously
for class in warrior rogue mage; do
  (
    HERO="${class^^}-$(date +%s)"
    TOKEN=$(curl -s -X POST http://localhost:8080/api/heroes/register \
      -d "{\"name\": \"$HERO\", \"class\": \"$class\"}" | jq -r .token)
    
    echo "$HERO:$TOKEN" >> ~/.autoquest/heroes.list
    ./start-hero.sh "$HERO" "$TOKEN" &
  )
done

# Monitor all
watch -n5 "cat ~/.autoquest/heroes.list | while read line; do
  hero=\$(echo \$line | cut -d: -f1)
  token=\$(echo \$line | cut -d: -f2)
  state=\$(curl -s http://localhost:8080/api/heroes/\$hero/status -H \"Authorization: Bearer \$token\")
  echo \"\$(echo \$state | jq -r .level)x \$hero: \$(echo \$state | jq -r .health)/\$(echo \$state | jq -r .maxHealth) HP\"\ndone"
```

### Achievement Farming

```bash
#!/usr/bin/env python3
# Auto-complete achievements

HERO = "ShadowHunter"
TOKEN = "..."

ACHIEVEMENTS = [
    "First Blood", "Level 10", "Dungeon Master", 
    "Boss Slayer", "Gold Hoarder", "Achievement Hunter"
]

for achievement in ACHIEVEMENTS:
    state = get_achievements(HERO, TOKEN)
    if achievement not in state['completed']:
        print(f"⏳ Working on: {achievement}")
        # Run specific strategy to unlock
        runachievement_strategy(achievement, HERO, TOKEN)

print("🎉 All achievements complete!")
```

### Auto-Upgrade System

```bash
#!/bin/bash
# ~/.autoquest/auto-upgrade.sh

TOKEN=$(jq -r .token ~/.autoquest/credentials.json)

# Get hero
STATE=$(curl -s http://localhost:8080/api/heroes/\$(jq -r .name ~/.autoquest/credentials.json)/status -H "Authorization: Bearer $TOKEN")

# Get upgrade points
POINTS=$(echo $STATE | jq -r .achievementPoints)

while [ "$POINTS" -ge 1 ]; do
  # Stat priority: Speed > Attack > Health
  if [ "$POINTS" -ge 1 ]; then
    echo "⬆️ Upgrading Speed..."
    curl -X POST http://localhost:8080/api/heroes/upgrade \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"stat": "speed", "points": 1}'
    POINTS=$((POINTS - 1))
  fi
done
```

### Event Participation

```bash
# Check for special events
EVENTS=$(curl -s http://localhost:8080/api/events/active)

if echo $EVENTS | jq -e '.[] | select(.type=="dungeon_bonus")'; then
  echo "🎉 Dungeon Bonus Event! XP × 2"
  # Switch to aggressive dungeon farming
  cp ~/.autoquest/styles/xp_farm.json ~/.autoquest/strategy.json
  ./autoquest.sh
fi

if echo $EVENTS | jq -e '.[] | select(.type=="boss_wars")'; do
  echo "⚔️ Boss Wars Event! Join guild..."
  # Participate in co-op boss fights
  curl -X POST http://localhost:8080/api/heroes/$HERO_NAME/join-boss-wars \
    -H "Authorization: Bearer $TOKEN"
fi
```

---

## 📈 Performance Tracking

### Session Logs

```bash
# Save every action
./autoquest.sh 2>&1 | tee -a ~/.autoquest/sessions/$(date +%Y-%m-%d).log

# Analyze progress
grep "Victory" ~/.autoquest/sessions/*.log | wc -l  # Total kills
grep "gold" ~/.autoquest/sessions/$(date +%Y-%m-%d).log | awk '{sum+=$2} END {print sum}'  # Daily gold
```

### Dashboard

```bash
# Generate progress report
cat ~/.autoquest/credentials.json | jq -r .name | {
  HERO=\$read;
  curl "http://localhost:8080/api/heroes/$HERO/dashboard"
} | tee ~/.autoquest/$HERO-reports/$(date +%Y%m%d).json

# Visual summary
jq '.summary' ~/.autoquest/$HERO-reports/$(date +%Y%m%d).json
```

---

## 😅 Troubleshooting

| Issue | Fix |
|-------|-----|
| Token expired | Re-register: `curl -X POST /api/heroes/register` |
| Hero not found | Check name: `jq -r .name ~/.autoquest/credentials.json` |
| Server offline | `pm2 start server.js` or `npm run server` |
| Inventory full | Run `return` to sell items |
| Repeated deaths | Increase `maxHealthThreshold` in strategy |
| No LLM response | Check OpenAI key or switch to rule-based |

---

## 🚀 Production Deployment

### Docker

```dockerfile
FROM node:18

WORKDIR /autoquest
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080
CMD ["node", "server.js"]
```

```bash
docker build -t autoquest .
docker run -p 8080:8080 autoquest
```

### Cron (Linux)

```bash
# Every 3 minutes
*/3 * * * * /home/user/.autoquest/explore-loop.sh >> /home/user/.autoquest/cron.log 2>&1
```

### systemd Service

```ini
# /etc/systemd/system/autoquest.service
[Unit]
Description=AutoQuest Hero Manager
After=network.target

[Service]
Type=simple
User=autoquest
ExecStart=/usr/bin/node /opt/autoquest/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable autoquest
sudo systemctl start autoquest
```

---

## 🎯 Next Steps

1. **Create Hero** - Choose class, get token
2. **Define Strategy** - Set play style in `strategy.json`
3. **Start Loop** - Run rule-based or LLM agent
4. **Monitor Progress** - Watch leaderboard, adjust strategy
5. **Unlock Achievements** - Complete all milestones
6. **Farm Gold/XP** - Maximize efficiency
7. **Claim Rewards** - Weekly token airdrops

---

## 📚 Reference

- **Strategy Guide**: `/autoquest/STRATEGY.md`
- **Class Builds**: `/autoquest/BUILDS.md`
- **Boss Tactics**: `/autoquest/BOSS.md`
- **Loot Database**: `/autoquest/LOOT.md`

---

**Game runs entirely via API.**  
Your agent reads game state → makes decisions → executes actions.  
Simple, autonomous, and infinitely customizable.

Built with 🌙 by Lyrantic
