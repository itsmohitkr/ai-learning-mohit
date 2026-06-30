// agent.js — the agent loop, now powered by MCP instead of hardcoded tools
//
// Compare this to agent-demo/src/agent.js — the LOOP is identical.
// The only difference: tools come from MCP servers (discovered at runtime)
// instead of being hardcoded in a tools.js file.

import Anthropic from "@anthropic-ai/sdk";
import { AGENT_CONFIG } from "./config.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * @param {string} task - user's flight request
 * @param {MCPClientManager} mcpManager - already connected, holds discovered tools
 */
export async function runAgent(task, mcpManager) {
  const messages = [{ role: "user", content: task }];
  let iteration = 0;
  const MAX_ITERATIONS = 8;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    const response = await client.messages.create({
      model: AGENT_CONFIG.model,
      max_tokens: AGENT_CONFIG.max_tokens,
      temperature: AGENT_CONFIG.temperature,
      system: AGENT_CONFIG.system,
      tools: mcpManager.allTools, // <- tools discovered from MCP servers, not hardcoded
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.text ?? "(no response)";
    }

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
      const toolResults = [];

      for (const toolUse of toolUseBlocks) {
        console.log(`[Agent] Calling MCP tool: ${toolUse.name}(${JSON.stringify(toolUse.input)})`);

        let resultContent;
        try {
          const mcpResult = await mcpManager.callTool(toolUse.name, toolUse.input);
          resultContent = JSON.stringify(mcpResult.content);
        } catch (err) {
          resultContent = JSON.stringify({ error: err.message });
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: resultContent,
        });
      }

      messages.push({ role: "user", content: toolResults });
    }
  }

  return "Max iterations reached — agent stopped.";
}
