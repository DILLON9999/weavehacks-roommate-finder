"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpClient = exports.MCPClientService = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
class MCPClientService {
    constructor() {
        this.client = null;
        this.transport = null;
        this.isConnected = false;
    }
    async connect(serverCommand, serverArgs = []) {
        try {
            // Create transport for communicating with MCP server
            this.transport = new stdio_js_1.StdioClientTransport({
                command: serverCommand,
                args: serverArgs
            });
            // Create client
            this.client = new index_js_1.Client({
                name: 'housing-agent-client',
                version: '1.0.0'
            }, {
                capabilities: {
                    tools: {}
                }
            });
            // Connect to server
            await this.client.connect(this.transport);
            this.isConnected = true;
            console.log('✅ Connected to MCP server');
            // List available tools
            const tools = await this.client.listTools();
            console.log('📋 Available MCP tools:', tools.tools.map(t => t.name));
        }
        catch (error) {
            console.error('❌ Failed to connect to MCP server:', error);
            throw error;
        }
    }
    async callTool(toolName, arguments_) {
        if (!this.client || !this.isConnected) {
            throw new Error('MCP client not connected. Call connect() first.');
        }
        try {
            console.log(`🔧 Calling MCP tool: ${toolName}`);
            const result = await this.client.callTool({
                name: toolName,
                arguments: arguments_
            });
            if (result.isError) {
                throw new Error(`MCP tool error: ${result.content}`);
            }
            return result.content;
        }
        catch (error) {
            console.error(`❌ MCP tool call failed for ${toolName}:`, error);
            throw error;
        }
    }
    async disconnect() {
        if (this.client && this.transport) {
            await this.client.close();
            this.isConnected = false;
            console.log('🔌 Disconnected from MCP server');
        }
    }
    isClientConnected() {
        return this.isConnected;
    }
}
exports.MCPClientService = MCPClientService;
// Singleton instance
exports.mcpClient = new MCPClientService();
