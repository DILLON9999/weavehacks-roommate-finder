import { ChatOpenAI } from '@langchain/openai';
import { config } from 'dotenv';

config();

// Core agent types (moved from deleted base-agent.ts)
export interface AgentCapability {
  name: string;
  description: string;
  parameters: Record<string, string>;
}

export interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent: string;
  type: 'request' | 'response' | 'broadcast';
  action: string;
  payload: any;
  timestamp: Date;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

// Base Agent class (essential functionality from deleted base-agent.ts)
export abstract class BaseAgent {
  protected agentId: string;
  protected agentName: string;
  protected model: ChatOpenAI;
  protected messageHandlers: Map<string, (message: AgentMessage) => Promise<AgentResponse>> = new Map();

  constructor(agentName: string, modelName: string = 'gpt-4o-mini') {
    this.agentId = `${agentName}-${Date.now()}`;
    this.agentName = agentName;
    this.model = new ChatOpenAI({
      modelName: modelName,
      temperature: 0.1,
    });
  }

  abstract initialize(): Promise<void>;
  abstract getCapabilities(): AgentCapability[];

  protected registerHandler(action: string, handler: (message: AgentMessage) => Promise<AgentResponse>): void {
    this.messageHandlers.set(action, handler);
  }

  async handleMessage(message: AgentMessage): Promise<AgentResponse> {
    const handler = this.messageHandlers.get(message.action);
    if (!handler) {
      return {
        success: false,
        error: `Unknown action: ${message.action}`
      };
    }

    try {
      return await handler(message);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  protected async makeAIDecision(prompt: string): Promise<string> {
    try {
      const response = await this.model.invoke(prompt);
      return response.content as string;
    } catch (error) {
      console.error('AI decision error:', error);
      throw error;
    }
  }

  get id(): string {
    return this.agentId;
  }

  get name(): string {
    return this.agentName;
  }
}

// MCP Server types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
}

// Base class for agents that expose MCP server interfaces
export abstract class MCPBaseAgent extends BaseAgent {
  protected mcpTools: Map<string, (args: any) => Promise<MCPToolResult>> = new Map();
  protected serverCapabilities: MCPServerCapabilities = {
    tools: { listChanged: false }
  };

  constructor(agentName: string, modelName: string = 'gpt-4o-mini') {
    super(agentName, modelName);
    this.setupMCPHandlers();
  }

  // Abstract method for agents to define their MCP tools
  abstract getMCPTools(): MCPTool[];
  
  // Abstract method for agents to register their tool implementations
  abstract registerMCPToolHandlers(): void;

  private setupMCPHandlers(): void {
    // Register MCP-specific message handlers
    this.registerHandler('mcp_list_tools', async () => ({
      success: true,
      data: {
        tools: this.getMCPTools()
      }
    }));

    this.registerHandler('mcp_call_tool', async (message) => {
      const { name, arguments: args } = message.payload as MCPToolCall;
      
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
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: {
            content: [{
              type: 'text' as const,
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
  protected registerMCPTool(name: string, handler: (args: any) => Promise<MCPToolResult>): void {
    this.mcpTools.set(name, handler);
  }

  // Helper to create successful MCP tool results
  protected createMCPResult(text: string): MCPToolResult {
    return {
      content: [{
        type: 'text',
        text
      }]
    };
  }

  // Helper to create error MCP tool results
  protected createMCPError(error: string): MCPToolResult {
    return {
      content: [{
        type: 'text',
        text: error
      }],
      isError: true
    };
  }

  // Helper to format complex data as JSON text
  protected createMCPJSONResult(data: any): MCPToolResult {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(data, null, 2)
      }]
    };
  }

  // Start the agent's MCP server capabilities
  async initializeMCP(): Promise<void> {
    await this.initialize();
    this.registerMCPToolHandlers();
    console.log(`🔧 MCP Server for ${this.agentName} initialized with ${this.mcpTools.size} tools`);
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

// MCP Client wrapper for communicating with other agents
export class MCPAgentClient {
  private targetAgent: MCPBaseAgent;
  private clientName: string;

  constructor(targetAgent: MCPBaseAgent, clientName: string) {
    this.targetAgent = targetAgent;
    this.clientName = clientName;
  }

  async listTools(): Promise<MCPTool[]> {
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

  async callTool(name: string, args: Record<string, any>): Promise<MCPToolResult> {
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

  async getCapabilities(): Promise<any> {
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