// Dra Air MCP server (demo)
// Same pattern as Joy Air — a second, independent airline MCP server.
// The agent treats both identically because they speak the same MCP protocol.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({ name: "draair-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "draair_search_flights",
      description: "Search Dra Air flights between two airports on a given date.",
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

  if (name === "draair_search_flights") {
    const flights = [
      { flightNumber: "DA330", from: args.from, to: args.to, date: args.date, price: 510, currency: "USD", duration: "9h 45m" },
      { flightNumber: "DA412", from: args.from, to: args.to, date: args.date, price: 575, currency: "USD", duration: "8h 55m" },
    ];
    return { content: [{ type: "text", text: JSON.stringify({ airline: "Dra Air", flights }) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
