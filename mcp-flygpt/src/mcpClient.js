// mcpClient.js — discovers tools from all configured MCP servers
// and routes tool_use calls to the right server.
//
// This is the piece that makes MCP powerful: the agent doesn't need to know
// in advance which airline owns which tool — it discovers everything at startup.
//
// Important: this client only CONNECTS to MCP servers. It never starts,
// owns, or manages their lifecycle. Each server in mcp.config.json is
// assumed to already be running somewhere — on your laptop for this demo,
// or on Joy Air's / Dra Air's own infrastructure in production. Swapping
// from "demo" to "production" is a config change (a URL), never a code
// change here.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import mcpConfig from "../mcp.config.json" with { type: "json" };

export class MCPClientManager {
  constructor() {
    this.clients = new Map();      // serverName -> Client instance
    this.toolToServer = new Map(); // toolName -> serverName
    this.allTools = [];
  }

  /**
   * Connect to every MCP server listed in mcp.config.json, and build a
   * combined tool list to hand to the LLM.
   *
   * Each server entry's URL can be overridden by an environment variable
   * (see `envVarOverride` in mcp.config.json) — that's the one line that
   * changes between "pointing at my local demo server" and "pointing at
   * the real airline's hosted MCP endpoint." Everything else is identical.
   */
  async connectAll() {
    for (const serverConfig of mcpConfig.mcpServers) {
      const url = process.env[serverConfig.envVarOverride] || serverConfig.url;

      const transport = new StreamableHTTPClientTransport(new URL(url));
      const client = new Client({ name: "flygpt-client", version: "1.0.0" }, { capabilities: {} });

      try {
        await client.connect(transport);
      } catch (error) {
        throw new Error(
          `Could not connect to MCP server '${serverConfig.name}' at ${url}. ` +
            `Is it running? (${error.message})`
        );
      }

      const { tools } = await client.listTools();

      for (const tool of tools) {
        this.toolToServer.set(tool.name, serverConfig.name);
        this.allTools.push({
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        });
      }

      this.clients.set(serverConfig.name, client);
      console.log(`[MCP] Connected to '${serverConfig.name}' at ${url} — ${tools.length} tool(s) discovered`);
    }

    return this.allTools;
  }

  /**
   * Route a tool call to whichever MCP server owns that tool.
   */
  async callTool(toolName, toolInput) {
    const serverName = this.toolToServer.get(toolName);
    if (!serverName) throw new Error(`No MCP server owns tool: ${toolName}`);

    const client = this.clients.get(serverName);
    const result = await client.callTool({ name: toolName, arguments: toolInput });
    return result;
  }

  async disconnectAll() {
    for (const client of this.clients.values()) {
      await client.close();
    }
  }
}
