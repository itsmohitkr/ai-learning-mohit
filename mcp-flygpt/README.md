# FlyGPT — AI Flight Booking Agent with MCP

Companion code for the **AI Learning lesson: "From Adapters to MCP"**.

Demonstrates replacing custom per-service adapters with the **Model Context Protocol (MCP)** — a standard that lets any AI agent talk to any service without writing custom integration code.

## What this project shows

**The problem it solves:** Before MCP, every airline needed its own adapter baked into the agent. 100 airlines = 100 adapters, each breaking whenever an API changes.

**The MCP solution:** Each airline publishes their own MCP server. Your agent speaks one language — MCP — and any MCP server plugs straight in. Adding a new airline means adding one line to `mcp.config.json`. Nothing else changes.

## Project structure

```
mcp-flygpt/
├── src/
│   ├── config.js          ← model, system prompt, settings
│   ├── mcpClient.js       ← discovers tools + routes tool calls to MCP servers
│   └── agent.js           ← the agent loop (think → act → observe)
├── mcp-servers/
│   ├── joyair/
│   │   └── server.js      ← Joy Air MCP server (demo)
│   └── draair/
│       └── server.js      ← Dra Air MCP server (demo)
├── server.js              ← Express server  POST /ask
├── mcp.config.json        ← which MCP servers to load
├── .env.example
└── package.json
```

> **Note on `mcp-servers/`:** In a real deployment, Joy Air and Dra Air would write and host their own MCP servers — either as npm packages (`npx joyair-mcp`) or cloud endpoints (`https://mcp.joyair.com/sse`). They are included here purely so you can see the full picture in one place.

## Quickstart

```bash
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
npm start

curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "Find me flights from BOM to LHR on 2025-09-01"}'
```

## Key concepts illustrated

- **MCP Client** — discovers available tools from all connected MCP servers at startup
- **Agent loop** — think (LLM call) → act (tool call) → observe (tool result) → repeat
- **Tool routing** — `mcpClient.js` knows which MCP server owns which tool and routes accordingly
- **Config-driven** — swap airlines by editing `mcp.config.json`, zero code changes

## How MCP server distribution works in the real world

| Distribution model | How it works | Example |
|---|---|---|
| **npm package** | Airline publishes `joyair-mcp` to npm. You run it via `npx`. Uses `stdio` transport. | `npx joyair-mcp` |
| **Cloud endpoint** | Airline hosts an MCP server publicly. Uses `sse` or `http` transport. | `https://mcp.joyair.com/sse` |
