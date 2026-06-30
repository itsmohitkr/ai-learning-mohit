// config.js — the agent's "identity card"

export const AGENT_CONFIG = {
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  temperature: 0.3,
  system: `You are a helpful assistant with access to tools.
Always use the available tools when they can help answer the user's question.
Be concise in your final answer. Show your reasoning briefly before giving the answer.`,
};
