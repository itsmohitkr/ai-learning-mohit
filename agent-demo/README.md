# Agent Demo — Node.js

A minimal but complete AI agent that can use real tools.

Companion code for the **AI Learning lesson: "How AI Agents Work"**.

## Project structure

```
agent-demo/
├── src/
│   ├── config.js       ← model, system prompt, settings
│   ├── tools.js        ← tool definitions (what the agent CAN do)
│   ├── toolRunner.js   ← tool execution (actually DOING the things)
│   └── agent.js        ← the agent loop (heart of the project)
├── index.js            ← entry point — ask the agent something
└── package.json
```

## How to run

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
node index.js
```

## What the agent can do

| Tool | What it does |
|---|---|
| `calculator` | Evaluate math expressions |
| `get_weather` | Fetch weather for a city (mocked) |
| `get_current_time` | Return current date/time |
| `web_search` | Simulate a web search (mocked) |

## Flow

1. `index.js` sends a task to the agent
2. `agent.js` calls the LLM with the system prompt + task + tool definitions
3. LLM responds with a `tool_use` block
4. `toolRunner.js` executes that tool and returns the result
5. The result is added to `messages[]` and the LLM is called again
6. Loop continues until the LLM returns plain text (no more tool calls)

This is the **agentic loop** — think → act → observe → repeat.
