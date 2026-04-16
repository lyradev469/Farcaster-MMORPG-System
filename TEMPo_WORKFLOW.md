# 🎭 Tempo Wallet Setup & Usage Guide

## Current Status (Container GLIBC Issue)

**Container:** Debian 12 (GLIBC 2.36)  
**Tempo Binary:** v1.5.0 (requires GLIBC 2.38+)  
**Result:** Binary cannot execute on this system

**Solution:** Run Tempo CLI on a compatible machine OR use web/SDK integration (already in AgentPad).

---

## ✅ Step-by-Step Setup (For Compatible Machine)

### 1. Install Tempo CLI
```bash
curl -fsSL https://tempo.xyz/install | bash
```

**Expected Output:**
```
✓ Tempo v1.5.0 installed successfully!
```

**Location:**
```
$HOME/.tempo/bin/tempo
```

---

### 2. Login to Tempo Wallet
```bash
"$HOME/.tempo/bin/tempo" wallet login
```

**What Happens:**
- Opens browser with Tempo Wallet
- You authenticate with Passkey/Biometrics
- Access key is provisioned on-chain
- Returns to terminal with confirmation

**Timeout Note:** For agents, use at least 16 minutes timeout.

---

### 3. Verify Setup
```bash
"$HOME/.tempo/bin/tempo" wallet -t whoami
```

**Expected Output:**
```
{
  "address": "0x...",
  "network": "tempo-mainnet",
  "ready": true,
  "balance": {
    "pathUSD": "10.5",
    "alphaUSD": "5.2"
  }
}
```

---

### 4. Fund Wallet (If Balance is 0)
```bash
# For testnet
"$HOME/.tempo/bin/tempo" wallet fund --testnet

# Or visit dashboard
open https://wallet.tempo.xyz
```

---

## 🚀 Service Discovery & Usage

### Find Available Services
```bash
# Search for AI services
"$HOME/.tempo/bin/tempo" wallet -t services --search ai

# Search for image generation
"$HOME/.tempo/bin/tempo" wallet -t services --search "image generation"

# View all services
"$HOME/.tempo/bin/tempo" wallet -t services
```

### Get Service Details
```bash
# Replace <SERVICE_ID> from search results
"$HOME/.tempo/bin/tempo" wallet -t services <SERVICE_ID>
```

**Output Includes:**
- Exact URL
- HTTP method (GET/POST)
- Request path
- Pricing per request
- Required fields

### Make API Calls (With Auto-Payment)

**Example: Image Generation**
```bash
"$HOME/.tempo/bin/tempo" request -t -X POST \
  --json '{"prompt": "a cute dog with blue background", "width": 512, "height": 512}' \
  https://api.stablestudio.com/v1/generate/images
```

**Example: Web Search**
```bash
"$HOME/.tempo/bin/tempo" request -t -X GET \
  "https://api.search.dev/v1/search?q=Rust+2025+release"
```

**Example: Browser Automation**
```bash
"$HOME/.tempo/bin/tempo" request -t -X POST \
  --json '{"url": "https://example.com", "action": "screenshot"}' \
  https://api.browser.dev/v1/run
```

---

## 📄 Advanced Patterns

### Multi-Service Workflow (Parallel Calls)
```bash
# Fire independent requests in parallel
(
  "$HOME/.tempo/bin/tempo" request -t --json '{"input":"summarize"}' $URL1 &
  "$HOME/.tempo/bin/tempo" request -t --json '{"input":"extract"}' $URL2 &
  "$HOME/.tempo/bin/tempo" request -t --json '{"input":"analyze"}' $URL3 &
  wait
)
```

### Dry Run (Check Cost Before Executing)
```bash
"$HOME/.tempo/bin/tempo" request -t --dry-run \
  --json '{"prompt": "test"}' \
  https://api.example.com/v1/generate
```

### Handle File Responses
```bash
# If response has image URL
"$HOME/.tempo/bin/tempo" request -t -X POST \
  --json '{"prompt": "cat"}' \
  https://api.imagegen.dev/v1/create | \
jq -r '.url' | xargs curl -fsSL -o cat.png
```

---

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| `tempo: command not found` | Source env: `source $HOME/.tempo/env` or use full path |
| "legacy V1 keychain" error | Reinstall: `curl -fsSL https://tempo.xyz/install \|\| bash` then `tempo update wallet` |
| "access key does not exist" | Run: `tempo wallet logout --yes && tempo wallet login` |
| HTTP 422 (wrong schema) | Check service details: `tempo wallet -t services <SERVICE_ID>` for exact fields |
| "Balance is 0" | Fund: `tempo wallet fund` or use dashboard |
| Timeout errors | Add `-m 60` flag for longer timeout |

---

## 🌐 Alternative: SDK Integration (No Binary Needed)

If you cannot use the CLI, integrate via **Node.js SDKs**:

```bash
npm install @tempo-xyz/viem @tempo-xyz/wagmi viem wagmi
```

**Usage:**
```typescript
import { createClient } from '@tempo-xyz/viem'
import { http } from 'viem'

const client = createClient({
  chain: 'tempo-mainnet',
  transport: http('https://rpc.tempo.xyz')
})

// Make transactions with fee sponsorship
const tx = await client.sendTransaction({
  to: '0x...',
  value: 100000000000000000n, // 0.1 pathUSD
  feePayer: '0x...', // Sponsored by your backend
})
```

**AgentPad v2 already implements this!** Web wallet connection works for all Tempo features.

---

## 📞 Quick Reference

| Command | Purpose |
|---------|---------|
| `tempo wallet login` | Authenticate user |
| `tempo wallet -t whoami` | Check status & balance |
| `tempo wallet -t services --search <query>` | Discover APIs |
| `tempo wallet -t services <ID>` | Get endpoint details |
| `tempo request -t <cmd>` | Call API (compact output) |
| `tempo request --dry-run <cmd>` | Preview cost |
| `tempo wallet fund` | Add testnet funds |

---

## 🎯 Starter Prompts for Testing

After login, try these:

1. **Image:**  
   `tempo request -t -X POST --json '{"prompt":"sunset ocean","width":512}' https://api.imagegen.dev/v1/create`

2. **Search:**  
   `tempo request -t -X GET "https://api.search.dev/v1/search?q=AI+trends+2025"`

3. **Browser:**  
   `tempo request -t -X POST --json '{"url":"https://example.com","action":"extract"}' https://api.browser.dev/v1/run`

---

**Last Updated:** 2026-03-26  
**Agent:** Lyrantic  
**Status:** Full guide ready (use on compatible system)
