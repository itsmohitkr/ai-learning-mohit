# Flight Agent + Hotel Agent — A2A Protocol Demo

Companion code for the **AI Learning lesson: "Agent-to-Agent: Implementing A2A with a Flight Agent and Hotel Agent"**.

Builds directly on the FlyGPT MCP lesson (`mcp-flygpt/`). Demonstrates **two specialist agents cooperating** — the "one agent, one job" + Agent-to-Agent pattern.

## What this shows

- **MCP** = how an agent talks to a *service* (Flight Agent ↔ Joy Air API)
- **A2A** = how an agent talks to *another agent* (Flight Agent ↔ Hotel Agent)

Both protocols run side by side in the Flight Agent — they are complementary, not competing. The LLM doesn't know or care which protocol a given tool call uses; from inside the agent loop, calling an airline via MCP and calling the Hotel Agent via A2A look identical.

## Project structure

```
flight-agent/                      hotel-agent/
├── src/                           ├── src/
│   ├── config.js                  │   ├── agentCard.js    ← A2A discovery manifest
│   ├── mcpClient.js    (MCP)      │   ├── taskStore.js    ← A2A task lifecycle
│   ├── a2aClient.js    (A2A)      │   └── skills.js       ← the actual work
│   └── agent.js        (merges    ├── server.js           ← the 3 A2A endpoints
│        both into one tool list)  └── package.json
├── mcp-servers/joyair/server.js   (reused from mcp-flygpt lesson)
├── server.js
├── mcp.config.json
└── a2a.config.json                ← which agents to discover
```

## MCP vs A2A — the relationship, not a replacement

| | MCP | A2A |
|---|---|---|
| Connects | Agent ↔ external service | Agent ↔ another agent |
| Unit of work | A tool call (`search_flights`) | A task (`search_hotels`, potentially long-running) |
| Discovery mechanism | `tools/list` | `GET /.well-known/agent.json` |
| Execution model | Synchronous request/response | Async task with status polling |
| Who implements it | The service provider (Joy Air) | The other agent's developer (you, for Hotel Agent) |
| Example in this lesson | Flight Agent → Joy Air MCP server | Flight Agent → Hotel Agent |

## Why async task lifecycle, not a simple HTTP call?

A naive version would be: Flight Agent makes an HTTP POST to Hotel Agent, Hotel Agent processes and responds, done. That works for instant operations — but real agent work (an actual hotel booking call to a third-party API) can take seconds or minutes. Blocking an HTTP connection for that long is fragile and doesn't scale.

The A2A spec instead models every request as a **task** with a lifecycle:

```
submitted → working → completed
                    → failed
                    → input-required   (needs more info from caller)
```

The caller submits a task, gets a task ID back immediately, and polls for status — the same pattern as async job queues in any production backend, just standardised so any two agents can speak it.

## Setup

```bash
# Hotel Agent
cd hotel-agent && npm install
cp .env.example .env

# Flight Agent
cd flight-agent && npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to flight-agent/.env
```

## Running it

```bash
# Terminal 1 — start the Hotel Agent FIRST
cd hotel-agent && node server.js
# [HOTEL AGENT] Running at http://localhost:4001

# Terminal 2 — start the Flight Agent
cd flight-agent && node server.js
# [SERVER] Discovering A2A agents...
# [A2A] Found "hotel-agent" — skills: search_hotels, book_hotel
# [SERVER] Flight Agent running at http://localhost:3000
```

Boot order matters: the Flight Agent discovers the Hotel Agent at startup and fails fast if it isn't already running — an intentional, explicit dependency rather than a silently degraded one.

**Test discovery directly:**

```bash
curl http://localhost:4001/.well-known/agent.json
```

**Test a full task lifecycle directly against the Hotel Agent:**

```bash
curl -X POST http://localhost:4001/tasks/send \
  -H "Content-Type: application/json" \
  -d '{"skillId":"search_hotels","input":{"location":"LHR","check_in":"2024-03-15","check_out":"2024-03-17","max_price":150}}'

curl http://localhost:4001/tasks/<task_id>
```

**Test the full system through the Flight Agent:**

```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"task": "Book the cheapest Joy Air flight from BOM to LHR on 2024-03-15, and find a hotel near LHR for the same dates under $150/night."}'
```

Watching both terminals simultaneously, you'll see the Flight Agent's `[A2A]` logs showing task submission and polling, interleaved with the Hotel Agent's `[HOTEL AGENT]` logs showing the task moving through `submitted → working → completed`. Two separate Node.js processes, two separate "brains," cooperating through a standard protocol.

## Key concepts

- **MCP and A2A are complementary, not competing.** MCP is for "agent talks to a tool/service." A2A is for "agent talks to another agent." The Flight Agent runs both protocols at once, and the LLM never has to know which one it's using.
- **The Agent Card is the contract.** Just like an MCP tool's `description` and `input_schema` tell the LLM what a tool does, the Agent Card's `skills[]` array tells the calling agent what an entire remote agent can do. Discovery happens once, at startup.
- **Tasks, not requests.** A2A models work as a stateful task (`submitted → working → completed/failed`), not a single blocking HTTP call.
- **Boot order is a real dependency.** The Flight Agent fails to start if the Hotel Agent isn't already running.
- **The prefix-routing pattern repeats.** `joyair__search_flights` (MCP) and `hotel-agent__search_hotels` (A2A) both use the same `source__capability` naming convention. Once learned once, it generalises to any number of protocols layered into one agent.
