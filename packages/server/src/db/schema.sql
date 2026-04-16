-- Farcaster MMORPG Database Schema
-- PostgreSQL/SQLite compatible

-- Players table (persistent data)
CREATE TABLE IF NOT EXISTS players (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL,
    wallet_address VARCHAR(66),
    level INTEGER DEFAULT 1,
    job VARCHAR(32) DEFAULT 'Novice',
    stats_str INTEGER DEFAULT 10,
    stats_agi INTEGER DEFAULT 10,
    stats_vit INTEGER DEFAULT 10,
    stats_int INTEGER DEFAULT 10,
    stats_dex INTEGER DEFAULT 10,
    stats_luk INTEGER DEFAULT 10,
    hp INTEGER DEFAULT 100,
    max_hp INTEGER DEFAULT 100,
    sp INTEGER DEFAULT 50,
    max_sp INTEGER DEFAULT 50,
    exp INTEGER DEFAULT 0,
    job_exp INTEGER DEFAULT 0,
    next_exp INTEGER DEFAULT 100,
    position_x INTEGER DEFAULT 1600,
    position_y INTEGER DEFAULT 1600,
    position_zone VARCHAR(32) DEFAULT 'zone_1',
    equipment_json JSONB DEFAULT '{}',
    inventory_json JSONB DEFAULT '[]',
    skills_json JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Agents table
CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    skill_url VARCHAR(255),
    behavior_json JSONB NOT NULL,
    state VARCHAR(16) DEFAULT 'registered',
    actions_count INTEGER DEFAULT 0,
    exp_total INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parties table
CREATE TABLE IF NOT EXISTS parties (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    leader_id VARCHAR(64) NOT NULL,
    exp_sharing BOOLEAN DEFAULT true,
    loot_mode VARCHAR(16) DEFAULT 'personal',
    max_members INTEGER DEFAULT 6,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leader_id) REFERENCES players(id)
);

-- Party members (junction table)
CREATE TABLE IF NOT EXISTS party_members (
    party_id VARCHAR(64) NOT NULL,
    player_id VARCHAR(64) NOT NULL,
    is_leader BOOLEAN DEFAULT false,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (party_id, player_id),
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Guilds table
CREATE TABLE IF NOT EXISTS guilds (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(64) UNIQUE NOT NULL,
    leader_id VARCHAR(64) NOT NULL,
    emblem VARCHAR(64),
    max_members INTEGER DEFAULT 30,
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    next_exp INTEGER DEFAULT 1000,
    skills_json JSONB DEFAULT '[]',
    alliances_json JSONB DEFAULT '[]',
    enemies_json JSONB DEFAULT '[]',
    castle_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leader_id) REFERENCES players(id)
);

-- Guild members (junction table)
CREATE TABLE IF NOT EXISTS guild_members (
    guild_id VARCHAR(64) NOT NULL,
    player_id VARCHAR(64) NOT NULL,
    rank VARCHAR(16) DEFAULT 'member',
    exp_contribution INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, player_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Combat logs (for analytics)
CREATE TABLE IF NOT EXISTS combat_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attacker_id VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    damage INTEGER NOT NULL,
    is_critical BOOLEAN DEFAULT false,
    skill_id VARCHAR(32),
    reason VARCHAR(128)
);

-- Drop logs (for economy tracking)
CREATE TABLE IF NOT EXISTS drop_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    killer_id VARCHAR(64) NOT NULL,
    monster_id VARCHAR(64) NOT NULL,
    item_id VARCHAR(64) NOT NULL,
    quantity INTEGER DEFAULT 1
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_token ON agents(token_hash);
CREATE INDEX IF NOT EXISTS idx_party_members_player ON party_members(player_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_player ON guild_members(player_id);
CREATE INDEX IF NOT EXISTS idx_combat_logs_attacker ON combat_logs(attacker_id);
CREATE INDEX IF NOT EXISTS idx_combat_logs_target ON combat_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_combat_logs_timestamp ON combat_logs(timestamp);

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_last_action()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_action = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agent_update
BEFORE UPDATE ON agents
FOR EACH ROW
EXECUTE FUNCTION update_last_action();
