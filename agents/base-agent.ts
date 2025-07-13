import { ChatOpenAI } from '@langchain/openai';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';

config();

// Message types for agent-to-agent communication
export interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent: string;
  type: 'request' | 'response' | 'broadcast';
  action: string;
  payload: any;
  timestamp: Date;
  conversationId?: string;
}

export interface AgentCapability {
  name: string;
  description: string;
  parameters: any;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  confidence?: number;
  metadata?: any;
}

// Base agent class implementing a2a communication
export abstract class BaseAgent {
  protected model: ChatOpenAI;
  public readonly agentId: string;
  public readonly agentName: string;
  protected capabilities: AgentCapability[] = [];
  protected messageHandlers: Map<string, (message: AgentMessage) => Promise<AgentResponse>> = new Map();
  protected connectedAgents: Map<string, BaseAgent> = new Map();

  constructor(agentName: string, modelName: string = 'gpt-4o-mini') {
    this.agentId = uuidv4();
    this.agentName = agentName;
    this.model = new ChatOpenAI({
      modelName,
      temperature: 0.1,
    });
    
    this.setupDefaultHandlers();
    console.log(`🤖 Agent ${this.agentName} (${this.agentId}) initialized`);
  }

  // Abstract methods that must be implemented by child agents
  abstract initialize(): Promise<void>;
  abstract getCapabilities(): AgentCapability[];

  // Setup default message handlers
  private setupDefaultHandlers(): void {
    this.messageHandlers.set('ping', async (message: AgentMessage) => ({
      success: true,
      data: { message: 'pong', agentName: this.agentName }
    }));

    this.messageHandlers.set('get_capabilities', async (message: AgentMessage) => ({
      success: true,
      data: this.getCapabilities()
    }));

    this.messageHandlers.set('get_status', async (message: AgentMessage) => ({
      success: true,
      data: {
        agentId: this.agentId,
        agentName: this.agentName,
        capabilities: this.getCapabilities().length,
        connectedAgents: Array.from(this.connectedAgents.keys())
      }
    }));
  }

  // Register a message handler for a specific action
  protected registerHandler(action: string, handler: (message: AgentMessage) => Promise<AgentResponse>): void {
    this.messageHandlers.set(action, handler);
  }

  // Connect to another agent
  public connectToAgent(agent: BaseAgent): void {
    this.connectedAgents.set(agent.agentId, agent);
    agent.connectedAgents.set(this.agentId, this);
    console.log(`🔗 ${this.agentName} connected to ${agent.agentName}`);
  }

  // Send message to another agent
  public async sendMessage(
    toAgentId: string,
    action: string,
    payload: any,
    conversationId?: string
  ): Promise<AgentResponse> {
    const targetAgent = this.connectedAgents.get(toAgentId);
    if (!targetAgent) {
      return {
        success: false,
        error: `Agent ${toAgentId} not connected`
      };
    }

    const message: AgentMessage = {
      id: uuidv4(),
      fromAgent: this.agentId,
      toAgent: toAgentId,
      type: 'request',
      action,
      payload,
      timestamp: new Date(),
      conversationId
    };

    console.log(`📤 ${this.agentName} → ${targetAgent.agentName}: ${action}`);
    return await targetAgent.handleMessage(message);
  }

  // Send message to agent by name
  public async sendMessageByName(
    agentName: string,
    action: string,
    payload: any,
    conversationId?: string
  ): Promise<AgentResponse> {
    const targetAgent = Array.from(this.connectedAgents.values())
      .find(agent => agent.agentName === agentName);
    
    if (!targetAgent) {
      return {
        success: false,
        error: `Agent ${agentName} not found`
      };
    }

    return await this.sendMessage(targetAgent.agentId, action, payload, conversationId);
  }

  // Broadcast message to all connected agents
  public async broadcastMessage(action: string, payload: any): Promise<AgentResponse[]> {
    const promises = Array.from(this.connectedAgents.values()).map(agent =>
      this.sendMessage(agent.agentId, action, payload)
    );
    
    return await Promise.all(promises);
  }

  // Handle incoming messages
  public async handleMessage(message: AgentMessage): Promise<AgentResponse> {
    console.log(`📥 ${this.agentName} ← ${message.fromAgent}: ${message.action}`);
    
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
      console.error(`❌ Error handling message ${message.action}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get agent information
  public getAgentInfo() {
    return {
      id: this.agentId,
      name: this.agentName,
      capabilities: this.getCapabilities(),
      connectedAgents: Array.from(this.connectedAgents.keys())
    };
  }

  // Utility method for AI-powered decision making
  protected async makeAIDecision(prompt: string): Promise<string> {
    try {
      const response = await this.model.invoke(prompt);
      return response.content as string;
    } catch (error) {
      console.error(`❌ AI decision error:`, error);
      throw error;
    }
  }

  // Utility method for structured AI responses
  protected async getStructuredResponse<T>(prompt: string, schema: string): Promise<T> {
    const fullPrompt = `${prompt}\n\nRespond with ONLY a JSON object matching this schema:\n${schema}`;
    
    try {
      const response = await this.model.invoke(fullPrompt);
      const content = response.content as string;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error(`❌ Structured response error:`, error);
      throw error;
    }
  }
}

// Agent coordinator for managing multiple agents
export class AgentCoordinator {
  private agents: Map<string, BaseAgent> = new Map();
  private conversations: Map<string, AgentMessage[]> = new Map();

  public registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.agentId, agent);
    console.log(`📋 Registered agent: ${agent.agentName}`);
    
    // Connect all agents to each other (full mesh)
    this.agents.forEach(existingAgent => {
      if (existingAgent.agentId !== agent.agentId) {
        agent.connectToAgent(existingAgent);
      }
    });
  }

  public getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  public getAgentByName(agentName: string): BaseAgent | undefined {
    return Array.from(this.agents.values()).find(agent => agent.agentName === agentName);
  }

  public getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  public async orchestrateTask(
    task: string,
    requiredCapabilities: string[],
    context?: any
  ): Promise<any> {
    console.log(`🎭 Orchestrating task: ${task}`);
    
    // Find agents with required capabilities
    const suitableAgents = Array.from(this.agents.values()).filter(agent => {
      const agentCapabilities = agent.getCapabilities().map(cap => cap.name);
      return requiredCapabilities.some(req => agentCapabilities.includes(req));
    });

    if (suitableAgents.length === 0) {
      throw new Error(`No agents found with capabilities: ${requiredCapabilities.join(', ')}`);
    }

    console.log(`🎯 Found ${suitableAgents.length} suitable agents`);
    
    // For now, return the suitable agents - this can be extended with more complex orchestration
    return {
      task,
      suitableAgents: suitableAgents.map(agent => agent.getAgentInfo()),
      context
    };
  }

  public getSystemStatus() {
    return {
      totalAgents: this.agents.size,
      agents: Array.from(this.agents.values()).map(agent => agent.getAgentInfo()),
      activeConversations: this.conversations.size
    };
  }
} 