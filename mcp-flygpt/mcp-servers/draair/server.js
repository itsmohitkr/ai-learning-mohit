// Dra Air MCP server (demo)
//
// Same pattern as Joy Air — a second, independent airline running its own
// MCP server on its own port. The agent treats both identically because
// they speak the same MCP protocol; it never needs to know these are
// two different companies' infrastructure, running two different codebases.

import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const PORT = process.env.DRAAIR_PORT || 4002;

function buildServer() {
  const server = new Server(
    { name: "draair-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
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

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
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

  return server;
}

const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => transport.close());

    const server = buildServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[draair-mcp] Request failed:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal MCP server error." });
    }
  }
});

app.get("/", (req, res) => {
  res.json({ service: "draair-mcp", status: "ok", endpoint: "/mcp" });
});

app.listen(PORT, () => {
  console.log(`[draair-mcp] Listening on http://localhost:${PORT}/mcp`);
  console.log(`[draair-mcp] In production, this would be Dra Air's own deployed URL — e.g. https://mcp.draair.com/mcp`);
});
