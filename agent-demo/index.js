// index.js — entry point
// Run four tasks of increasing complexity to see the agent in action.

import "./src/env.js";
import { runAgent } from "./src/agent.js";

async function main() {
  // Task 1 — Pure tool use: math
  await runAgent("What is (1234 * 5678) + (9999 / 3)?");

  // Task 2 — Multi-step: math + time
  await runAgent("What time is it right now, and what is 60 * 60 * 24 * 365?");

  // Task 3 — Single tool: weather
  await runAgent("What's the weather like in Tokyo?");

  // Task 4 — Multi-tool chain: weather + calculator
  await runAgent(
    "What's the weather in London and Tokyo? What is the average temperature between the two cities?"
  );
}

main().catch(console.error);
