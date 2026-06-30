// mcpClient.js — discovers tools from all configured MCP servers
// and routes tool_use calls to the right server.
//
// This is the piece that makes MCP powerful: the agent doesn't need to know
// in advance which airline owns which tool — it discovers everything at startup.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import mcpConfig from "../mcp.config.json" with { type: "json" };

export class MCPClientManager {
  constructor() {
    this.clients = new Map();   // serverName -> Client instance
    this.toolToServer = new Map(); // toolName -> serverName
    this.allTools = [];
  }

  /**
   * Connect to every MCP server listed in mcp.config.json,
   * and build a combined tool list to hand to the LLM.
   */
  async connectAll() {
    for (const serverConfig of mcpConfig.mcpServers) {
      const transport = new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args,
      });

      const client = new Client({ name: "flygpt-client", version: "1.0.0" }, { capabilities: {} });
      await client.connect(transport);

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
      console.log(`[MCP] Connected to '${serverConfig.name}' — ${tools.length} tool(s) discovered`);
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
