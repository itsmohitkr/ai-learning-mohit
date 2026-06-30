// tools.js — tool DEFINITIONS
// These are NOT the actual implementations. This is what we send to the LLM
// so it knows (a) which tools exist, (b) when to use them, (c) what args to pass.

export const TOOLS = [
  {
    name: "calculator",
    description:
      "Evaluate a mathematical expression and return the numeric result. " +
      "Use this for any arithmetic, algebra, or numeric calculation. " +
      "Input must be a valid JavaScript math expression string.",
    input_schema: {
      type: "object",
      properties: {
        expression: { type: "string", description: "Math expression to evaluate, e.g. '(42 * 7) + 100 / 4'" },
      },
      required: ["expression"],
    },
  },
  {
    name: "get_weather",
    description: "Get the current weather for a given city. Returns temperature in Celsius and a short weather description.",
    input_schema: {
      type: "object",
      properties: { city: { type: "string", description: "City name, e.g. 'London' or 'Tokyo'" } },
      required: ["city"],
    },
  },
  {
    name: "get_current_time",
    description: "Get the current date and time in ISO 8601 format.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "web_search",
    description:
      "Search the web for up-to-date information on a topic. " +
      "Use this when the user asks about recent events, news, or facts that might be beyond the training data cutoff.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "The search query string" } },
      required: ["query"],
    },
  },
];
