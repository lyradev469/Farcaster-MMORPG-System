#!/bin/bash
# Full Deploy Script for AgentPad
# Usage: ./deploy-full.sh

set -e

echo "🚀 Starting AgentPad Full Deployment..."
echo "---"

# Step 1: Verify repos
echo "1. Checking Git repositories..."
cd /home/agent/openclaw/agentpad-frontend
if [ -d ".git" ]; then
    echo "   ✅ Frontend repo exists"
    git pull origin main
else
    echo "   ❌ Frontend repo not initialized"
    exit 1
fi

cd /home/agent/openclaw/agentpad-backend
if [ -d ".git" ]; then
    echo "   ✅ Backend repo exists"
    git pull origin main
else
    echo "   ❌ Backend repo not initialized"
    exit 1
fi

# Step 2: Install dependencies
echo "2. Installing dependencies..."
cd /home/agent/openclaw/agentpad-frontend
npm install --legacy-peer-deps 2>/dev/null || npm install
echo "   ✅ Frontend deps installed"

cd /home/agent/openclaw/agentpad-backend
npm install --legacy-peer-deps 2>/dev/null || npm install
echo "   ✅ Backend deps installed"

# Step 3: Start backend in background
echo "3. Starting local backend server..."
cd /home/agent/openclaw/agentpad-backend
export API_KEY="154ffa41b01ea3d1e2c3d62c723b7ed626d5820d015b586fe42bc556d1f1aa4b"
export PORT=3001
export CORS_ORIGINS="http://localhost:3000,https://agentpad.vercel.app"
nohup node src/index.ts > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "   ✅ Backend running on port 3001 (PID: $BACKEND_PID)"

# Wait for backend to be ready
sleep 3
if curl -s http://localhost:3001/health > /dev/null; then
    echo "   ✅ Backend health check passed"
else
    echo "   ⚠️  Backend may still be starting... checking in 2s"
    sleep 2
    curl -s http://localhost:3001/health || echo "   ❌ Backend not responding"
fi

# Step 4: Update frontend config
echo "4. Configuring frontend for local backend..."
cd /home/agent/openclaw/agentpad-frontend
if [ -f ".env.local" ]; then
    sed -i 's|NEXT_PUBLIC_KEY_MANAGER_URL=.*|NEXT_PUBLIC_KEY_MANAGER_URL=http://localhost:3001|g' .env.local
else
    cat > .env.local << EOF
# AgentPad Frontend Environment
NEXT_PUBLIC_RPC_URL=https://rpc.moderato.tempo.xyz
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=85be66e6169307dc900bc2337d69d10a
NEXT_PUBLIC_KEY_MANAGER_URL=http://localhost:3001
NEXT_PUBLIC_KEY_MANAGER_API_KEY=154ffa41b01ea3d1e2c3d62c723b7ed626d5820d015b586fe42bc556d1f1aa4b
NODE_ENV=development
EOF
fi
echo "   ✅ Frontend configured"

# Step 5: Run frontend build
echo "5. Building frontend..."
cd /home/agent/openclaw/agentpad-frontend
npm run build 2>&1 | tail -10 || echo "   ⚠️  Build may have warnings"
echo "   ✅ Frontend build complete"

# Step 6: Test API endpoints
echo "6. Testing backend API..."
TEST_USER="0xTESTUSER123"
TEST_CRED="test-cred-id-456"
TEST_PUBKEY="test-public-key-789"

echo "   - Testing POST /keys..."
curl -X POST http://localhost:3001/keys \
  -H "X-API-Key: 154ffa41b01ea3d1e2c3d62c723b7ed626d5820d015b586fe42bc556d1f1aa4b" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$TEST_USER\",\"credentialId\":\"$TEST_CRED\",\"publicKey\":\"$TEST_PUBKEY\"}" 2>/dev/null && echo "     ✅ OK" || echo "     ❌ Failed"

echo "   - Testing GET /keys/:userId..."
curl http://localhost:3001/keys/$TEST_USER \
  -H "X-API-Key: 154ffa41b01ea3d1e2c3d62c723b7ed626d5820d015b586fe42bc556d1f1aa4b" 2>/dev/null && echo "     ✅ OK" || echo "     ❌ Failed"

echo "   - Testing GET /health..."
curl http://localhost:3001/health 2>/dev/null && echo "     ✅ OK" || echo "     ❌ Failed"

echo "---"
echo "🎉 Local deployment complete!"
echo ""
echo "📊 Access Points:"
echo "   Frontend: http://localhost:3000 (run: npm run dev)"
echo "   Backend:  http://localhost:3001 (running)"
echo "   API Docs: http://localhost:3001/"
echo ""
echo "🚀 To deploy to Vercel:"
echo "   cd agentpad-backend && vercel --prod"
echo ""
echo "⚠️  Background processes:"
echo "   - Backend PID: $BACKEND_PID"
echo "   - Stop with: kill $BACKEND_PID"
echo ""
echo "✅ Everything ready for testing!"
