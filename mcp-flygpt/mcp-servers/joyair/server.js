// Joy Air MCP server (demo)
//
// In a real deployment, Joy Air would write, host, and operate this
// themselves — on their own infrastructure, at their own URL, with their
// own uptime and security responsibilities. Your agent would never run
// this file. It would just know the URL and connect to it.
//
// This file exists so you can see the full picture in one repo, but it's
// architecturally identical to a third-party service: it runs as its own
// standalone process, on its own port, and speaks MCP over HTTP.

import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const PORT = process.env.JOYAIR_PORT || 4001;

function buildServer() {
  const server = new Server(
    { name: "joyair-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
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

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
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

  return server;
}

const app = express();
app.use(express.json());

// Stateless mode: a fresh Server + Transport per request. No session state
// to manage, which keeps a demo server (and many real ones) simple. If you
// need the client to maintain a long-lived session with server-pushed
// events, use a sessionIdGenerator instead — see the MCP SDK docs.
app.post("/mcp", async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => transport.close());

    const server = buildServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[joyair-mcp] Request failed:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal MCP server error." });
    }
  }
});

app.get("/", (req, res) => {
  res.json({ service: "joyair-mcp", status: "ok", endpoint: "/mcp" });
});

app.listen(PORT, () => {
  console.log(`[joyair-mcp] Listening on http://localhost:${PORT}/mcp`);
  console.log(`[joyair-mcp] In production, this would be Joy Air's own deployed URL — e.g. https://mcp.joyair.com/mcp`);
});
