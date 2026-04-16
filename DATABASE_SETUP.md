# Database Setup Guide

## Overview

The MMORPG uses two data stores:
1. **SQLite** (with better-sqlite3) - Fast, embedded, perfect for development
2. **PostgreSQL** (optional) - Production grade, for scaling

## Initial Setup

### 1. Create Data Directory

```bash
mkdir -p packages/server/data
```

### 2. Run Migrations

```bash
cd packages/server
npm run db:migrate
```

This creates all tables in `data/mmo.db`.

### 3. Seed Sample Data (Optional)

```bash
npm run db:seed
```

Pre-populates monsters, items, and starter data.

## Schema Highlights

### Players Table
- Stores persistent player data
- JSON columns for flexible equipment/inventory
- Indexed by username and ID

### AI Agents Table
- Token-based authentication
- Behavior JSON for dynamic configuration
- Action counters for analytics

### Parties & Guilds
- Junction tables for many-to-many relationships
- Support for leader/officer/member ranks
- Alloy and enemy relationships

## Production: PostgreSQL

### Migration to PostgreSQL

1. **Install PostgreSQL client:**
   ```bash
   pip install psycopg2-binary
   ```

2. **Export SQLite to SQL:**
   ```bash
   sqlite3 data/mmo.db .dump > dump.sql
   ```

3. **Import to PostgreSQL:**
   ```bash
   psql -U postgres -d mmorpg < dump.sql
   ```

4. **Update environment variables:**
   ```env
   DATABASE_URL=postgresql://user:pass@localhost:5432/mmorpg
   REDIS_URL=redis://localhost:6379
   ```

## Redis Usage

Redis stores:
- Real-time player states (for fast reads)
- Skill cooldowns
- Active sessions
- Pub/Sub for inter-server messaging

Example Redis keys:
```
player:{id} -> Hash of current state
skill_cooldown:{player}:{skill} -> Expiring string
session:{clientId} -> WebSocket reference mapping
```

## Backup Strategy

```bash
# Daily backup script
cp data/mmo.db data/mmo_$(date +%Y%m%d).db
# Or use SQLite backup API for live dumps
```

## Troubleshooting

### Database Locked
```bash
rm -f data/mmo.db-shm data/mmo.db-wal
```

### Migration Failures
Drop tables and rerun:
```bash
sqlite3 data/mmo.db "DROP TABLE IF EXISTS players; DROP TABLE IF EXISTS agents;"
npm run db:migrate
```
