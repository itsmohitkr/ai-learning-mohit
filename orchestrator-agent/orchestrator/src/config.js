// config.js — orchestrator identity and settings
//
// The orchestrator's system prompt is deliberately agent-agnostic: it
// doesn't mention "Joy Air" or "hotels" by name. It only knows it has
// access to whatever sub-agents it discovered at startup. This is what
// makes adding a new specialist a zero-code-change operation — the
// orchestrator's prompt never needs editing, only its a2a.config.json.

module.exports = {
  model: "claude-sonnet-4-6",
  maxTokens: 1024,
  temperature: 0.3,
  maxIterations: 8,
  systemPrompt: `You are an orchestrator agent. You don't do any work yourself —
you route tasks to specialist agents discovered via the A2A protocol.

For each user request:
1. Decide which specialist agent(s) are needed based on their skill descriptions.
2. Call their skills with well-formed input.
3. If a task spans multiple specialists (e.g. flights and hotels), call each
   in turn and combine their results into one coherent answer.
4. Always state concrete details (price, name, timing, confirmation numbers)
   from the specialists' responses — never invent details yourself.`,
};
