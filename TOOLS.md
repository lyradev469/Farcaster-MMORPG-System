# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## Environment

This container includes: python3/pip, node/npm/pnpm/bun, git, brew, curl, wget, jq, and standard Unix tools.

## Tool Selection Guide

- `web_fetch`: Preferred for simple HTTP requests — fetching web pages, public APIs, articles. Handles timeouts and redirects automatically.
- `exec` + `curl`: For requests needing custom headers, auth tokens, POST bodies, or piping to `jq`. Always use `--connect-timeout 5 --max-time 10` to fail fast.
- `edit` over `write`: For modifying existing files, prefer edit (targeted changes) over write (full overwrite).
- `sessions_spawn`: Delegate independent subtasks to run in parallel when possible.
- **Fail fast**: If a tool or approach fails twice, read the error carefully and try a different approach. Don't retry the same approach more than once.

## OpenClaw CLI

Use `openclaw` to manage configuration, channels, skills, and more.

If you're unsure about a command's syntax, try `<command> --help` to see what's available. Don't guess flags or arguments.

## Gateway Management

- `openclaw gateway restart`, `stop`, and `start` do **not** work — there is no systemd in this container.
- To restart the gateway: `pkill -u agent -x openclaw` — this kills only the agent-owned parent openclaw process (which brings down the gateway child). The entrypoint restart loop relaunches it within ~5 seconds. Do NOT use `pkill -f 'openclaw gateway run'` — it matches root-owned processes (`runuser`, entrypoint) which you cannot kill.
- Most config changes (models, channels, plugins) require a gateway restart to take effect.
- Exception: the per-model `streaming` setting in `openclaw.json` is read on every API call, so it takes effect immediately without restart.

## Container Environment

- OpenClaw is installed globally. Do NOT run `pnpm install`, `pnpm build`, `npm install`, or any build commands.
- You are running inside a Docker container as user `agent`.

## Skills

Skills extend what you can do. Check available skills with `openclaw skills`. Install more from ClawHub with `clawhub install <name>`. Skills are auto-discovered and loaded when relevant.

---

## Onchain Development Tools

### forge
**Category:** Build & Test  
**Status:** Active

Foundry's smart contract compiler and test framework. Used for compiling Solidity, running unit and fuzz tests, gas snapshots, and deployment scripts.

```bash
forge build
forge test --gas-report
forge script script/Deploy.s.sol --rpc-url base --broadcast --verify
```

### cast
**Category:** EVM Interaction  
**Status:** Active

Foundry's CLI for interacting with the EVM. Send transactions, call contracts, decode data, estimate gas.

```bash
cast call <contract> "balanceOf(address)" <address> --rpc-url base
cast send <contract> "deposit(uint256)" 1000 --rpc-url base --private-key $PK
cast run <txhash> --rpc-url base
```

### viem
**Category:** Onchain Read/Write (TypeScript)  
**Status:** Active

Type-safe Ethereum library for TypeScript. Preferred over ethers.js for all scripts and backends.

```ts
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const client = createPublicClient({ chain: base, transport: http() })
```

### wagmi
**Category:** React Frontend  
**Status:** Active

React hooks for Ethereum. Used for all onchain frontend UIs alongside viem.

```ts
import { useReadContract, useWriteContract } from 'wagmi'
```

### safe-sdk
**Category:** Wallet / Multisig  
**Status:** Active

Safe{Core} SDK for deploying and interacting with Safe multisig wallets. Used for contracts holding significant value.

### ens
**Category:** Identity  
**Status:** Active

Ethereum Name Service. Used for resolving wallet addresses to human-readable names and publishing onchain identity.

### the-graph
**Category:** Indexing  
**Status:** Standby

Decentralized protocol for indexing and querying onchain events. Used when an app needs rich historical data queries.

### ipfs / pinata
**Category:** Storage  
**Status:** Standby

Decentralized file storage for NFT metadata, app assets, and large data blobs that should not live onchain.

---

## Tool Improvement Log

When a tool is improved, patched, or wrapped — log it here.

| Date | Tool | Change |
|---|---|---|
| — | — | — |

---

## Known Issues

Document tool friction and workarounds here.

| Tool | Issue | Workaround |
|---|---|---|
| — | — | — |

---

## Tools Wishlist

Improvements and new tools to build:

- [ ] CLI scaffold generator for new Foundry projects with standard structure
- [ ] Gas price monitor script that alerts when Base gas drops below threshold
- [ ] Auto-verify wrapper that retries Basescan verification with backoff
- [ ] Deployment registry: local JSON that tracks all deployed contracts by network

---

## Adding a New Tool

To register a new tool, add a section above with:
- Name
- Category
- Status (Active / Standby / Experimental)
- Description
- Usage example or code snippet

---

_This file is yours to evolve. As you learn what works, update it — better patterns, new tools, lessons from failures._
