"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPAgentClient = exports.MCPBaseAgent = exports.BaseAgent = void 0;
const openai_1 = require("@langchain/openai");
const dotenv_1 = require("dotenv");
const weave = __importStar(require("weave"));
const openai_2 = __importDefault(require("openai"));
(0, dotenv_1.config)();
// Base Agent class (essential functionality from deleted base-agent.ts)
class BaseAgent {
    constructor(agentName, modelName = 'gpt-4o-mini') {
        this.messageHandlers = new Map();
        this.agentId = `${agentName}-${Date.now()}`;
        this.agentName = agentName;
        this.model = new openai_1.ChatOpenAI({
            modelName: modelName,
            temperature: 0.1,
        });
        // Initialize OpenAI client for Weave integration
        this.openaiClient = new openai_2.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
        // Initialize Weave once for all agents
        this.initializeWeave();
    }
    registerHandler(action, handler) {
        this.messageHandlers.set(action, handler);
    }
    async handleMessage(message) {
        const handler = this.messageHandlers.get(message.action);
        if (!handler) {
            return {
                success: false,
                error: `Unknown action: ${message.action}`
            };
        }
        try {
            return await handler(message);
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async initializeWeave() {
        if (!BaseAgent.weaveInitialized && process.env.WEAVE_API_KEY) {
            try {
                await weave.init('housing-data-collector');
                BaseAgent.weaveInitialized = true;
                console.log('🎯 Weave initialized for tracking');
            }
            catch (error) {
                console.warn('⚠️ Weave initialization failed:', error);
            }
        }
    }
    // Weave-wrapped AI decision method
    async makeAIDecisionWithWeave(prompt, agentName) {
        try {
            const response = await this.openaiClient.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
            });
            return response.choices[0].message.content || '';
        }
        catch (error) {
            console.error(`AI decision error in ${agentName}:`, error);
            throw error;
        }
    }
    async makeAIDecision(prompt) {
        // Use Weave-wrapped method if available, fallback to LangChain
        if (process.env.WEAVE_API_KEY && BaseAgent.weaveInitialized) {
            const wrappedFunction = weave.op(this.makeAIDecisionWithWeave.bind(this), {
                name: `${this.agentName}_ai_decision`
            });
            return await wrappedFunction(prompt, this.agentName);
        }
        else {
            // Fallback to LangChain
            try {
                const response = await this.model.invoke(prompt);
                return response.content;
            }
            catch (error) {
                console.error('AI decision error:', error);
                throw error;
            }
        }
    }
    get id() {
        return this.agentId;
    }
    get name() {
        return this.agentName;
    }
}
exports.BaseAgent = BaseAgent;
BaseAgent.weaveInitialized = false;
// Base class for agents that expose MCP server interfaces
class MCPBaseAgent extends BaseAgent {
    constructor(agentName, modelName = 'gpt-4o-mini') {
        super(agentName, modelName);
        this.mcpTools = new Map();
        this.serverCapabilities = {
            tools: { listChanged: false }
        };
        this.setupMCPHandlers();
        this.wrapMCPMethodsWithWeave();
    }
    setupMCPHandlers() {
        // Register MCP-specific message handlers
        this.registerHandler('mcp_list_tools', async () => ({
            success: true,
            data: {
                tools: this.getMCPTools()
            }
        }));
        this.registerHandler('mcp_call_tool', async (message) => {
            const { name, arguments: args } = message.payload;
            const handler = this.mcpTools.get(name);
            if (!handler) {
                return {
                    success: false,
                    error: `Tool ${name} not found`
                };
            }
            try {
                const result = await handler(args);
                return {
                    success: true,
                    data: result
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    data: {
                        content: [{
                                type: 'text',
                                text: `Error executing tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
                            }],
                        isError: true
                    }
                };
            }
        });
        this.registerHandler('mcp_get_capabilities', async () => ({
            success: true,
            data: {
                capabilities: this.serverCapabilities,
                serverInfo: {
                    name: this.agentName,
                    version: '1.0.0'
                }
            }
        }));
    }
    // Register an MCP tool implementation
    registerMCPTool(name, handler) {
        this.mcpTools.set(name, handler);
    }
    // Helper to create successful MCP tool results
    createMCPResult(text) {
        return {
            content: [{
                    type: 'text',
                    text
                }]
        };
    }
    // Helper to create error MCP tool results
    createMCPError(error) {
        return {
            content: [{
                    type: 'text',
                    text: error
                }],
            isError: true
        };
    }
    // Helper to format complex data as JSON text
    createMCPJSONResult(data) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify(data, null, 2)
                }]
        };
    }
    // Start the agent's MCP server capabilities
    async initializeMCP() {
        await this.initialize();
        this.registerMCPToolHandlers();
        console.log(`🔧 MCP Server for ${this.agentName} initialized with ${this.mcpTools.size} tools`);
    }
    wrapMCPMethodsWithWeave() {
        if (process.env.WEAVE_API_KEY && BaseAgent.weaveInitialized) {
            // Wrap the handleMessage method with Weave tracking
            const originalHandleMessage = this.handleMessage.bind(this);
            this.handleMessage = weave.op(originalHandleMessage, {
                name: `${this.agentName}_handle_message`
            });
        }
    }
    // Get MCP server info for orchestrator
    getMCPServerInfo() {
        return {
            agentName: this.agentName,
            agentId: this.agentId,
            tools: this.getMCPTools(),
            capabilities: this.serverCapabilities
        };
    }
}
exports.MCPBaseAgent = MCPBaseAgent;
// MCP Client wrapper for communicating with other agents
class MCPAgentClient {
    constructor(targetAgent, clientName) {
        this.targetAgent = targetAgent;
        this.clientName = clientName;
    }
    async listTools() {
        const response = await this.targetAgent.handleMessage({
            id: `mcp-${Date.now()}`,
            fromAgent: this.clientName,
            toAgent: this.targetAgent.id,
            type: 'request',
            action: 'mcp_list_tools',
            payload: {},
            timestamp: new Date()
        });
        if (response.success && response.data?.tools) {
            return response.data.tools;
        }
        throw new Error(`Failed to list tools: ${response.error}`);
    }
    async callTool(name, args) {
        const response = await this.targetAgent.handleMessage({
            id: `mcp-${Date.now()}`,
            fromAgent: this.clientName,
            toAgent: this.targetAgent.id,
            type: 'request',
            action: 'mcp_call_tool',
            payload: { name, arguments: args },
            timestamp: new Date()
        });
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(`Failed to call tool ${name}: ${response.error}`);
    }
    async getCapabilities() {
        const response = await this.targetAgent.handleMessage({
            id: `mcp-${Date.now()}`,
            fromAgent: this.clientName,
            toAgent: this.targetAgent.id,
            type: 'request',
            action: 'mcp_get_capabilities',
            payload: {},
            timestamp: new Date()
        });
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(`Failed to get capabilities: ${response.error}`);
    }
}
exports.MCPAgentClient = MCPAgentClient;
