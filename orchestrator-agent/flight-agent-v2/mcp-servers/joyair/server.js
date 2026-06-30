// Joy Air MCP server (demo) — unchanged from a2a-flygpt/flight-agent/mcp-servers/joyair/server.js
// In a real deployment, Joy Air would write and host this themselves.

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
    {
      name: "joyair_book_flight",
      description: "Book a specific Joy Air flight. Returns a booking confirmation.",
      inputSchema: {
        type: "object",
        properties: {
          flight_number: { type: "string", description: "Flight number to book, e.g. JA101" },
          passenger_name: { type: "string", description: "Full name of the passenger" },
        },
        required: ["flight_number", "passenger_name"],
      },
    },
  ],
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "joyair_search_flights") {
    const flights = [
      { flightNumber: "JA101", from: args.from, to: args.to, date: args.date, price: 542, currency: "USD", duration: "9h 20m" },
      { flightNumber: "JA205", from: args.from, to: args.to, date: args.date, price: 489, currency: "USD", duration: "10h 05m" },
    ];
    return { content: [{ type: "text", text: JSON.stringify({ airline: "Joy Air", flights }) }] };
  }

  if (name === "joyair_book_flight") {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          confirmation_number: `JA-${Date.now().toString(36).toUpperCase()}`,
          flight_number: args.flight_number,
          passenger_name: args.passenger_name,
          status: "confirmed",
        }),
      }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
