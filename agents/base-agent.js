"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCoordinator = exports.BaseAgent = void 0;
const openai_1 = require("@langchain/openai");
const uuid_1 = require("uuid");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
// Base agent class implementing a2a communication
class BaseAgent {
    constructor(agentName, modelName = 'gpt-4o-mini') {
        this.capabilities = [];
        this.messageHandlers = new Map();
        this.connectedAgents = new Map();
        this.agentId = (0, uuid_1.v4)();
        this.agentName = agentName;
        this.model = new openai_1.ChatOpenAI({
            modelName,
            temperature: 0.1,
        });
        this.setupDefaultHandlers();
        console.log(`🤖 Agent ${this.agentName} (${this.agentId}) initialized`);
    }
    // Setup default message handlers
    setupDefaultHandlers() {
        this.messageHandlers.set('ping', async (message) => ({
            success: true,
            data: { message: 'pong', agentName: this.agentName }
        }));
        this.messageHandlers.set('get_capabilities', async (message) => ({
            success: true,
            data: this.getCapabilities()
        }));
        this.messageHandlers.set('get_status', async (message) => ({
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
    registerHandler(action, handler) {
        this.messageHandlers.set(action, handler);
    }
    // Connect to another agent
    connectToAgent(agent) {
        this.connectedAgents.set(agent.agentId, agent);
        agent.connectedAgents.set(this.agentId, this);
        console.log(`🔗 ${this.agentName} connected to ${agent.agentName}`);
    }
    // Send message to another agent
    async sendMessage(toAgentId, action, payload, conversationId) {
        const targetAgent = this.connectedAgents.get(toAgentId);
        if (!targetAgent) {
            return {
                success: false,
                error: `Agent ${toAgentId} not connected`
            };
        }
        const message = {
            id: (0, uuid_1.v4)(),
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
    async sendMessageByName(agentName, action, payload, conversationId) {
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
    async broadcastMessage(action, payload) {
        const promises = Array.from(this.connectedAgents.values()).map(agent => this.sendMessage(agent.agentId, action, payload));
        return await Promise.all(promises);
    }
    // Handle incoming messages
    async handleMessage(message) {
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
        }
        catch (error) {
            console.error(`❌ Error handling message ${message.action}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    // Get agent information
    getAgentInfo() {
        return {
            id: this.agentId,
            name: this.agentName,
            capabilities: this.getCapabilities(),
            connectedAgents: Array.from(this.connectedAgents.keys())
        };
    }
    // Utility method for AI-powered decision making
    async makeAIDecision(prompt) {
        try {
            const response = await this.model.invoke(prompt);
            return response.content;
        }
        catch (error) {
            console.error(`❌ AI decision error:`, error);
            throw error;
        }
    }
    // Utility method for structured AI responses
    async getStructuredResponse(prompt, schema) {
        const fullPrompt = `${prompt}\n\nRespond with ONLY a JSON object matching this schema:\n${schema}`;
        try {
            const response = await this.model.invoke(fullPrompt);
            const content = response.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('No valid JSON found in response');
        }
        catch (error) {
            console.error(`❌ Structured response error:`, error);
            throw error;
        }
    }
}
exports.BaseAgent = BaseAgent;
// Agent coordinator for managing multiple agents
class AgentCoordinator {
    constructor() {
        this.agents = new Map();
        this.conversations = new Map();
    }
    registerAgent(agent) {
        this.agents.set(agent.agentId, agent);
        console.log(`📋 Registered agent: ${agent.agentName}`);
        // Connect all agents to each other (full mesh) - bidirectional connections
        this.agents.forEach(existingAgent => {
            if (existingAgent.agentId !== agent.agentId) {
                agent.connectToAgent(existingAgent);
                existingAgent.connectToAgent(agent);
            }
        });
    }
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    getAgentByName(agentName) {
        return Array.from(this.agents.values()).find(agent => agent.agentName === agentName);
    }
    getAllAgents() {
        return Array.from(this.agents.values());
    }
    async orchestrateTask(task, requiredCapabilities, context) {
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
    getSystemStatus() {
        return {
            totalAgents: this.agents.size,
            agents: Array.from(this.agents.values()).map(agent => agent.getAgentInfo()),
            activeConversations: this.conversations.size
        };
    }
}
exports.AgentCoordinator = AgentCoordinator;
