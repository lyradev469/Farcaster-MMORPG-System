#!/bin/bash
# AgentPad Deploy to Vercel
# Author: Lyrantic

set -e

echo "🚀 Deploying AgentPad to Vercel..."

cd /home/agent/openclaw/agentpad-frontend

# Install Vercel CLI if not exists
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check package.json has vercel config
if ! grep -q "vercel" package.json; then
    echo "📝 Adding Vercel config to package.json..."
    # Vercel auto-detects Next.js, no config needed
fi

# Deploy
echo "🔥 Deploying to production..."
vercel --prod --confirm

echo ""
echo "🎉 SUCCESS! AgentPad is live on Vercel!"
echo "📝 Use 'vercel ls' to see your deployments"
echo ""
