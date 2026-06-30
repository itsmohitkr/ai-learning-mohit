// Joy Air MCP server (demo)
// In a real deployment, Joy Air would write and host this themselves.
// This is a minimal MCP server exposing one tool: search_flights

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({ name: "joyair-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "joyair_search_flights",
      description: "Search Joy Air flights between two airports on a given date.",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "string", description: "Origin airport code, e.g. BOM" },
          to: { type: "string", description: "Destination airport code, e.g. LHR" },
          date: { type: "string", description: "Travel date, YYYY-MM-DD" },
        },
        required: ["from", "to", "date"],
      },
    },
  ],
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "joyair_search_flights") {
    // Mocked flight data
    const flights = [
      { flightNumber: "JA101", from: args.from, to: args.to, date: args.date, price: 542, currency: "USD", duration: "9h 20m" },
      { flightNumber: "JA205", from: args.from, to: args.to, date: args.date, price: 489, currency: "USD", duration: "10h 05m" },
    ];
    return { content: [{ type: "text", text: JSON.stringify({ airline: "Joy Air", flights }) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
