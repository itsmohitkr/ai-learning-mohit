// agent.js — THE AGENT LOOP
// 1. Sends the user's task to the LLM (with tool definitions)
// 2. If the LLM wants to call a tool → run it, add result to messages[], repeat
// 3. If the LLM returns text with no tool calls → we're done, return the answer

import Anthropic from "@anthropic-ai/sdk";
import { AGENT_CONFIG } from "./config.js";
import { TOOLS } from "./tools.js";
import { runTool } from "./toolRunner.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runAgent(task) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TASK: ${task}`);
  console.log('='.repeat(60));

  const messages = [{ role: "user", content: task }];
  let iteration = 0;
  const MAX_ITERATIONS = 10;

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`\n[Iteration ${iteration}] Calling LLM...`);

    const response = await client.messages.create({
      model: AGENT_CONFIG.model,
      max_tokens: AGENT_CONFIG.max_tokens,
      temperature: AGENT_CONFIG.temperature,
      system: AGENT_CONFIG.system,
      tools: TOOLS,
      messages,
    });

    console.log(`[Iteration ${iteration}] Stop reason: ${response.stop_reason}`);
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      const answer = textBlock?.text ?? "(no text response)";
      console.log(`\nFINAL ANSWER:\n${answer}`);
      return answer;
    }

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
      const toolResults = [];

      for (const toolUse of toolUseBlocks) {
        console.log(`\n  → Tool call: ${toolUse.name}`);
        console.log(`    Input: ${JSON.stringify(toolUse.input)}`);

        let result;
        try {
          result = runTool(toolUse.name, toolUse.input);
        } catch (err) {
          result = { error: err.message };
        }

        console.log(`    Result: ${JSON.stringify(result)}`);

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: "user", content: toolResults });
    }
  }

  return "Max iterations reached — agent stopped.";
}
