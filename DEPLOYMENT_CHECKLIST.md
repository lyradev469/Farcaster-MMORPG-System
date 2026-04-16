# Deployment Checklist

## Pre-Deployment

### 1. Infrastructure Setup
- [ ] Install Redis (or use cloud Redis like Upstash)
- [ ] Set up PostgreSQL (optional, for production)
- [ ] Configure environment variables (see `.env.example`)
- [ ] Ensure Node.js 20+ is installed

### 2. Server Build
```bash
cd packages/server
npm install
npx tsc --noEmit  # Type check
npm run build     # Compile to dist/
```

### 3. Client Build
```bash
cd packages/client
npm install
npm run build     # Next.js production build
```

### 4. Database Migration
```bash
cd packages/server
mkdir -p data
npm run db:migrate
npm run db:seed   # Optional: sample data
```

## Environment Variables

Create `.env` files in both packages:

### Server `.env`
```env
PORT=3001
WS_PORT=3002
REDIS_URL=redis://localhost:6379
DB_PATH=./data/mmo.db
JWT_SECRET=your-secret-key-here
NODE_ENV=production
```

### Client `.env.local`
```env
NEXT_PUBLIC_WS_URL=ws://your-server.com:3002
NEXT_PUBLIC_HTTP_URL=https://your-server.com:3001
NEXT_PUBLIC_SERVER_URL=https://your-server.com
```

## Deployment Options

### Option 1: Vercel (Frontend) + Railway/Render (Backend)

#### Frontend (Vercel)
```bash
cd packages/client
vercel --prod
```
- Set environment variables in Vercel dashboard
- Enable automatic deployments from git

#### Backend (Railway)
```bash
cd packages/server
railway up
```
- Attach Redis instance
- Set environment variables
- Configure PM2 for process management

### Option 2: Docker (Self-hosted)

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
  
  server:
    build: ./packages/server
    ports:
      - "3001:3001"
      - "3002:3002"
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
      - PORT=3001
      - WS_PORT=3002
  
  client:
    build: ./packages/client
    ports:
      - "3000:3000"
    depends_on:
      - server
    environment:
      - NEXT_PUBLIC_WS_URL=ws://server:3002
      - NEXT_PUBLIC_HTTP_URL=http://server:3001
```

Deploy:
```bash
docker-compose up -d
```

### Option 3: Traditional VPS

```bash
# Install dependencies
sudo apt update
sudo apt install -y nodejs npm redis-server postgresql

# Clone repo
git clone https://github.com/your-org/farcaster-mmorpg.git
cd farcaster-mmorpg

# Build server
cd packages/server
npm install
npm run build
pm2 start dist/index.js --name "mmo-server"

# Build client
cd ../../client
npm install
npm run build
pm2 start npm --name "mmo-client" -- start

# Configure Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Set up firewall
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Farcaster Mini App Setup

1. **Register your domain** on Farcaster
2. **Create a Frame** with your deployment URL
3. **Configure permissions** for wallet connections
4. **Test via Warpcast** preview

Example Frame URL: `https://your-domain.xyz/frame`

## Post-Deployment Testing

### 1. Health Checks
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok",...}
```

### 2. WebSocket Connection
```bash
wscat -c ws://localhost:3002
# Send: {"type":"login","data":{"username":"test"}}
```

### 3. AI Agent Registration
```bash
curl -X POST http://localhost:3001/agent/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-agent",
    "name": "Test Agent",
    "behavior": {"primary_goal": "exp"}
  }'
```

### 4. Client Rendering
- Open http://localhost:3000
- Verify Phaser canvas loads
- Verify PixiJS UI overlays correctly
- Check WebSocket connection status

## Monitoring & Observability

### Recommended Tools
- **PM2** for process management
- **New Relic** or **DataDog** for APM
- **Sentry** for error tracking
- **Prometheus + Grafana** for metrics

### Key Metrics to Track
- WebSocket connections count
- AI agent actions per minute
- Server tick latency
- Redis memory usage
- Player count over time

## Scaling Strategy

### Horizontal Scaling
1. **Shard by zone**: Each server instance handles specific zones
2. **Redis cluster**: For distributed state caching
3. **Load balancer**: Nginx or HAProxy in front of WebSocket servers

### Optimizations
- Enable gzip compression
- Use CDN for static assets (sprites, textures)
- Implement server-side caching for monster spawns
- Batch WebSocket messages per frame

## Troubleshooting

### Issue: WebSocket not connecting
- Check firewall rules (port 3002)
- Verify Redis is running
- Check `ws://` vs `wss://` for production

### Issue: Client white screen
- Verify environment variables are set
- Check browser console for errors
- Ensure assets are served correctly

### Issue: AI agents not spawning
- Confirm agent state is 'registered'
- Check `skillUrl` is accessible
- Verify behavior parsing in logs

## Security Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Enable rate limiting on API
- [ ] Configure CORS properly
- [ ] Use HTTPS in production
- [ ] Sanitize user inputs
- [ ] Regular dependency updates
- [ ] Database backups scheduled

## Next Steps After Deployment

1. **Load Testing**: Simulate 100+ concurrent connections
2. **Asset Pipeline**: Add custom sprites and tilemaps
3. **Content Creation**: Design new monsters, quests, areas
4. **Community**: Set up Discord/Telegram for players
5. **Analytics**: Track player retention and engagement

---

**Happy Deploying! 🚀**

*Remember: Ship first, iterate fast.*
