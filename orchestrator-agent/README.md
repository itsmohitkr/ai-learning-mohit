# Orchestrator Agent — fixing the Flight ↔ Hotel coupling

Companion code for **lesson 07**, which follows directly from the A2A lesson (`a2a-flygpt/`).

## The problem with `a2a-flygpt/`

In the previous lesson, the Flight Agent called the Hotel Agent directly:

```
Flight Agent ──A2A──▶ Hotel Agent
```

This works for two agents but breaks down as a real architectural pattern:

| Problem | Why it bites |
|---|---|
| **Boot-order coupling** | Flight Agent fails to start unless Hotel Agent is already running. With N agents, every agent might need every other agent up first — an unmanageable dependency graph. |
| **Hardcoded knowledge** | Flight Agent's `a2a.config.json` hardcodes the Hotel Agent's URL. Adding a Car Rental Agent means editing and redeploying Flight Agent itself. |
| **No central control point** | Logging, auth, rate limiting, and routing logic for the *whole system* have nowhere to live — they're smeared across whichever agent happens to initiate a call. |
| **Asymmetric agents** | Flight Agent is both "a specialist" and "a caller of other specialists" — two responsibilities in one process. Hotel Agent is purely passive. That asymmetry doesn't generalize: what happens when Hotel Agent also needs to call someone? |

## The fix — an orchestrator

```
                          ┌─────────────────────┐
        User request ───▶ │   Orchestrator    │
                          │   Agent           │
                          └─────────┬─────────┘
                                    │ (A2A: discovers + routes to both)
                ┌─────────────────────┼─────────────────────┐
                ▼                                       ▼
          Flight Agent                            Hotel Agent
          (MCP → Joy Air)                          (own skills)
```

A single **Orchestrator Agent** is the only thing that holds the registry of sub-agents. Flight Agent and Hotel Agent become **pure specialists** — symmetric, unaware of each other, each exposing an Agent Card and the same 3 A2A endpoints. Neither one calls anyone.

| | `a2a-flygpt/` (lesson 06) | `orchestrator-agent/` (this lesson) |
|---|---|---|
| Who calls Hotel Agent | Flight Agent | Orchestrator |
| Who calls Flight Agent | Nobody (Flight Agent is the entry point) | Orchestrator |
| Flight Agent's role | Specialist + caller (asymmetric) | Pure specialist (symmetric with Hotel Agent) |
| Boot order | Hotel Agent must start first | Any order — orchestrator discovers whoever is up, retries the rest |
| Adding a 3rd agent (e.g. car rental) | Edit Flight Agent's `a2a.config.json`, redeploy Flight Agent | Add one line to orchestrator's config, redeploy only the orchestrator |
| Central place for routing/logging/auth | None | The orchestrator |

## Project structure

```
orchestrator-agent/
├── src/
│   ├── config.js              ← model, system prompt, settings
│   └── a2aClient.js           ← discovers + calls sub-agents (with retry)
├── server.js                  ← Express server  POST /ask
├── a2a.config.json            ← registry of all sub-agents
└── package.json

flight-agent-v2/                hotel-agent-v2/
├── src/                         ├── src/
│   ├── agentCard.js  ← NEW      │   ├── agentCard.js  (unchanged)
│   ├── taskStore.js  ← NEW      │   ├── taskStore.js  (unchanged)
│   ├── skills.js     ← NEW      │   ├── skills.js     (unchanged)
│   └── mcpClient.js  (kept)     │   └── ...
├── server.js  ← now serves      ├── server.js  (unchanged shape)
│   the 3 A2A endpoints,
│   no longer calls Hotel Agent
└── package.json                 └── package.json
```

Flight Agent gains the exact same shape Hotel Agent already had (`agentCard.js`, `taskStore.js`, the 3 endpoints) — it loses `a2aClient.js` and `a2a.config.json` entirely. That symmetry is the point: any specialist agent in this system looks identical from the outside, whether it's backed by an MCP server, a database, or a mocked skill.

## How discovery + retry works

The orchestrator's `a2aClient.js` is the same discovery pattern from lesson 06, with one addition: **per-agent retry with backoff** instead of crashing if one sub-agent isn't up yet.

```javascript
async function discoverAllAgents(agentConfig, { retries = 3, delayMs = 1000 } = {}) {
  for (const def of agentConfig.agents) {
    let attempt = 0;
    while (attempt < retries) {
      try {
        await discoverAgent(def.name, def.url);
        break; // success
      } catch (err) {
        attempt++;
        if (attempt >= retries) {
          console.warn(`[ORCHESTRATOR] Giving up on "${def.name}" after ${retries} attempts — continuing without it`);
        } else {
          await new Promise(r => setTimeout(r, delayMs * attempt));
        }
      }
    }
  }
}
```

This is the direct fix for boot-order coupling: the orchestrator starts regardless of which sub-agents are up, retries the ones that aren't, and simply offers fewer tools to the LLM if a sub-agent never comes online — rather than refusing to boot at all.

## Setup

```bash
# Hotel Agent (unchanged from lesson 06, just renamed)
cd hotel-agent-v2 && npm install
cp .env.example .env

# Flight Agent (now A2A-server-only, no longer an A2A client)
cd flight-agent-v2 && npm install
cp .env.example .env

# Orchestrator
cd orchestrator-agent && npm install
cp .env.example .env
# Add ANTHROPIC_API_KEY
```

## Running it

```bash
# Terminal 1 — Hotel Agent (any order now)
cd hotel-agent-v2 && node server.js
# [HOTEL AGENT] Running at http://localhost:4001

# Terminal 2 — Flight Agent (any order now)
cd flight-agent-v2 && node server.js
# [FLIGHT AGENT] Running at http://localhost:4002

# Terminal 3 — Orchestrator (discovers both, retries if either is slow to start)
cd orchestrator-agent && node server.js
# [ORCHESTRATOR] Discovering sub-agents...
# [A2A] Found "flight-agent" — skills: search_flights, book_flight
# [A2A] Found "hotel-agent" — skills: search_hotels, book_hotel
# [ORCHESTRATOR] Running at http://localhost:3000
```

Try starting the Orchestrator **before** the other two — it retries instead of crashing, and you'll see it pick up each agent as it comes online.

**Test the full system:**

```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"task": "Book the cheapest Joy Air flight from BOM to LHR on 2024-03-15, and find a hotel near LHR for the same dates under $150/night."}'
```

Same request as lesson 06 — but now it's the Orchestrator, not the Flight Agent, doing the routing. Flight Agent has no idea Hotel Agent exists, and vice versa.

## Key concepts

- **Symmetry over hierarchy-by-accident.** In lesson 06, Flight Agent ended up "more important" than Hotel Agent purely because it happened to be the one with a `tools[]` list. That's an architectural smell — important agents shouldn't be more important just because they were built first. Every specialist here looks identical from the outside.
- **The orchestrator is just another A2A peer.** It doesn't use a different protocol — it discovers sub-agents and submits tasks exactly the way Flight Agent did in lesson 06. The only difference is *who* holds the registry.
- **Retry replaces fail-fast.** Lesson 06's Flight Agent exited immediately if Hotel Agent wasn't reachable. A real orchestrator degrades gracefully — it starts with whatever's available and keeps trying the rest in the background.
- **Adding a new specialist is now a one-line change.** Want a Car Rental Agent? Build it with the same `agentCard.js` + `taskStore.js` + `skills.js` shape, add one entry to the orchestrator's `a2a.config.json`, and nothing else in the system changes.
- **This still isn't a full production system.** No auth between orchestrator and specialists, no persistent task store (still an in-memory `Map`), no agent registry service (still a static JSON file). Those are the next layers — but the *shape* of the architecture now matches how real multi-agent systems are built.
