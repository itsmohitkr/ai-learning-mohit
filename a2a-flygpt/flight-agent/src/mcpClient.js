// mcpClient.js — discovers tools from configured MCP servers and routes
// tool_use calls to the right server. Reused from the mcp-flygpt lesson —
// the A2A lesson adds a sibling client (a2aClient.js) with the same shape,
// so the agent loop can merge both into one capability list.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import mcpConfig from "../mcp.config.json" with { type: "json" };

class MCPClientManager {
  constructor() {
    this.clients = new Map();
    this.toolToServer = new Map();
    this.allTools = [];
  }

  async connectAll() {
    for (const serverConfig of mcpConfig.mcpServers) {
      const transport = new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args,
      });

      const client = new Client({ name: "flygpt-a2a-client", version: "1.0.0" }, { capabilities: {} });
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

  getAllTools() {
    return this.allTools;
  }

  async callTool(toolName, toolInput) {
    const serverName = this.toolToServer.get(toolName);
    if (!serverName) throw new Error(`No MCP server owns tool: ${toolName}`);

    const client = this.clients.get(serverName);
    const result = await client.callTool({ name: toolName, arguments: toolInput });
    return result;
  }

  async initMcpServers() {
    return this.connectAll();
  }

  async disconnectAll() {
    for (const client of this.clients.values()) {
      await client.close();
    }
  }
}

const mcpClient = new MCPClientManager();
export default mcpClient;
