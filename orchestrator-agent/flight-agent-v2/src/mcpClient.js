// mcpClient.js — connects to the Joy Air MCP server
//
// Unchanged in shape from lesson 05/06's mcpClient.js. The difference is
// what's BUILT ON TOP: previously this fed tools directly to Flight
// Agent's own LLM loop. Now it's wrapped by skills.js and only reachable
// via Flight Agent's A2A endpoints — MCP is fully internal to this
// specialist, invisible to the orchestrator.

// Uses dynamic import() because the rest of this project is CommonJS
// (require/module.exports) but the MCP SDK ships as ESM-only.
let Client, StdioClientTransport;

class MCPClientManager {
  constructor() {
    this.client = null;
  }

  async connect() {
    // Dynamic import: the MCP SDK is ESM-only, loaded lazily on first connect.
    ({ Client } = await import("@modelcontextprotocol/sdk/client/index.js"));
    ({ StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js"));

    const transport = new StdioClientTransport({
      command: "node",
      args: ["./mcp-servers/joyair/server.js"],
    });

    this.client = new Client({ name: "flight-agent-v2", version: "2.0.0" }, { capabilities: {} });
    await this.client.connect(transport);

    const { tools } = await this.client.listTools();
    console.log(`[MCP] Connected to Joy Air — ${tools.length} tool(s) available`);
    return tools;
  }

  async callTool(toolName, toolInput) {
    if (!this.client) throw new Error('MCP client not connected — call connect() first');
    return this.client.callTool({ name: toolName, arguments: toolInput });
  }

  async disconnect() {
    if (this.client) await this.client.close();
  }
}

const mcpClient = new MCPClientManager();
module.exports = mcpClient;
