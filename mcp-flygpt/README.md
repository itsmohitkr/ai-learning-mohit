# FlyGPT — AI Flight Booking Agent with MCP

Companion code for the **AI Learning lesson: "From Adapters to MCP"**.

Demonstrates replacing custom per-service adapters with the **Model Context Protocol (MCP)** — a standard that lets any AI agent talk to any service without writing custom integration code.

## What this project shows

**The problem it solves:** Before MCP, every airline needed its own adapter baked into the agent. 100 airlines = 100 adapters, each breaking whenever an API changes.

**The MCP solution:** Each airline publishes their own MCP server. Your agent speaks one language — MCP — and any MCP server plugs straight in. Adding a new airline means adding one line to `mcp.config.json`. Nothing else changes.

## A note on architecture: who runs what

This is important, and it's the main thing that changed in v2 of this repo.

**You do not run other companies' MCP servers.** In a real deployment, Joy Air and Dra Air each write, host, and operate their own MCP server — on their own infrastructure, at their own URL, with their own uptime and security responsibilities. Your job, as the person building the *agent* (the MCP client), is only to **connect** to those already-running servers. You'd never `npx` or spawn someone else's production service as part of your own deployment.

This repo now reflects that split honestly:

- `mcp-servers/joyair/server.js` and `mcp-servers/draair/server.js` are **standalone HTTP services**, each running on its own port, each independently startable and stoppable. They exist here so you can see the full picture and run a working demo locally — but architecturally, they represent infrastructure *someone else* owns.
- `server.js` (the FlyGPT app itself) and `src/mcpClient.js` are the only things **you** would actually deploy. The client connects to whatever URLs are in `mcp.config.json` / your environment variables — it never starts a server process itself.

Swapping from "local demo" to "real production airlines" is a **two-line environment variable change** (`JOYAIR_MCP_URL`, `DRAAIR_MCP_URL`). Zero code changes.

## Project structure

```
mcp-flygpt/
├── src/
│   ├── config.js          ← model, system prompt, settings
│   ├── mcpClient.js       ← connects to MCP servers over HTTP + routes tool calls
│   └── agent.js           ← the agent loop (think → act → observe)
├── mcp-servers/                      ← demo only — not part of your deployment
│   ├── joyair/
│   │   └── server.js      ← standalone HTTP MCP server, port 4001
│   └── draair/
│       └── server.js      ← standalone HTTP MCP server, port 4002
├── server.js               ← Express server, POST /ask — this is YOUR app
├── mcp.config.json         ← which MCP servers to connect to, and their URLs
├── .env.example
└── package.json
```

## Quickstart (running the full demo locally)

Because this repo includes mock versions of the airline servers for demo purposes, running everything locally takes **three terminals** — this is intentional, and mirrors reality: your app (terminal 3) is a separate process from infrastructure it doesn't own (terminals 1 and 2).

```bash
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

**Terminal 1 — Joy Air's MCP server (stand-in for their real infrastructure):**
```bash
npm run demo:joyair
# [joyair-mcp] Listening on http://localhost:4001/mcp
```

**Terminal 2 — Dra Air's MCP server:**
```bash
npm run demo:draair
# [draair-mcp] Listening on http://localhost:4002/mcp
```

**Terminal 3 — Your FlyGPT app:**
```bash
npm start
# [MCP] Connected to 'joyair' at http://localhost:4001/mcp — 1 tool(s) discovered
# [MCP] Connected to 'draair' at http://localhost:4002/mcp — 1 tool(s) discovered
# FlyGPT running on http://localhost:3000
```

Then:
```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "Find me flights from BOM to LHR on 2025-09-01"}'
```

## Deploying against real airline MCP servers

If Joy Air and Dra Air (or any other airline) publish real MCP endpoints, you don't touch terminals 1 or 2 at all — you don't run their code, ever. You just point your `.env` at their real URLs:

```
JOYAIR_MCP_URL=https://mcp.joyair.com/mcp
DRAAIR_MCP_URL=https://mcp.draair.com/mcp
```

Then run only your own app:

```bash
npm start
```

`mcpClient.js` and `server.js` don't change at all — that's the entire point of the protocol being standardized.

## Key concepts illustrated

- **MCP Client** — discovers available tools from all connected MCP servers at startup, over HTTP
- **Agent loop** — think (LLM call) → act (tool call) → observe (tool result) → repeat
- **Tool routing** — `mcpClient.js` knows which MCP server owns which tool and routes accordingly
- **Config-driven** — swap airlines, or swap from demo to production, by editing `mcp.config.json` / environment variables, zero code changes
- **Client/server ownership boundary** — the single most important architectural lesson in this repo: you build and deploy the client; you never own the servers you connect to

## Transport: why Streamable HTTP, not stdio

An earlier version of this demo used MCP's `stdio` transport, which works by **spawning the server as a local child process** (`command: "node", args: [...]`). That's a legitimate MCP transport — it's exactly right for tools that run *on your own machine* (a local file-system tool, for example). But it silently implies "I own and run this process," which is false for a third-party airline's MCP server.

This version uses **Streamable HTTP transport** instead — the client connects to a URL over the network, the same way it would talk to any REST API. This is the transport real, independently-hosted MCP servers use, and it's what makes the "just change a URL" deployment story actually true.

## How MCP server distribution works in the real world

| Distribution model | How it works | Example |
|---|---|---|
| **npm package (stdio)** | A tool author publishes a package. You run it locally via `npx`. Appropriate for local tools you genuinely own and run yourself. | `npx some-local-tool-mcp` |
| **Cloud endpoint (Streamable HTTP)** | A company hosts an MCP server publicly. You never run their code — you just connect to their URL. This is the model this repo now demonstrates. | `https://mcp.joyair.com/mcp` |
