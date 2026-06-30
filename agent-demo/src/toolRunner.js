// toolRunner.js — tool EXECUTION
// This is where the actual work happens.

function calculator({ expression }) {
  try {
    const result = new Function(`"use strict"; return (${expression})`)();
    return { result, expression };
  } catch (err) {
    return { error: `Invalid expression: ${err.message}` };
  }
}

function get_weather({ city }) {
  const mockData = {
    london: { temp: 14, description: "Partly cloudy", humidity: 72 },
    tokyo: { temp: 28, description: "Sunny", humidity: 55 },
    "new york": { temp: 22, description: "Clear skies", humidity: 60 },
    paris: { temp: 18, description: "Light rain", humidity: 80 },
    mumbai: { temp: 32, description: "Hot and humid", humidity: 88 },
    kolkata: { temp: 34, description: "Partly cloudy", humidity: 85 },
  };
  const key = city.toLowerCase();
  const data = mockData[key] ?? { temp: 20, description: "Unknown", humidity: 65 };
  return { city, ...data, unit: "Celsius" };
}

function get_current_time() {
  return { datetime: new Date().toISOString(), timezone: "UTC" };
}

function web_search({ query }) {
  return {
    query,
    results: [
      { title: `Search result 1 for "${query}"`, snippet: `Mock result. In production, hook up Tavily or SerpAPI here.`, url: `https://example.com/result1` },
      { title: `Search result 2 for "${query}"`, snippet: `Another mock result demonstrating the tool interface.`, url: `https://example.com/result2` },
    ],
  };
}

export function runTool(toolName, toolInput) {
  const toolMap = { calculator, get_weather, get_current_time, web_search };
  const fn = toolMap[toolName];
  if (!fn) throw new Error(`Unknown tool: ${toolName}`);
  return fn(toolInput);
}
