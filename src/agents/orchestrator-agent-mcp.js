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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorAgentMCP = void 0;
const mcp_base_agent_1 = require("./mcp-base-agent");
const housing_agent_mcp_1 = require("./housing-agent-mcp");
const commute_agent_mcp_1 = require("./commute-agent-mcp");
const messenger_agent_mcp_1 = require("./messenger-agent-mcp");
const weave = __importStar(require("weave"));
class OrchestratorAgentMCP extends mcp_base_agent_1.MCPBaseAgent {
    constructor() {
        super('OrchestratorAgentMCP', 'gpt-4o');
        this.housingAgent = null;
        this.commuteAgent = null;
        this.messengerAgent = null;
        this.housingClient = null;
        this.commuteClient = null;
        this.messengerClient = null;
        this.availableAgents = new Map();
    }
    async initialize() {
        console.log('🎭 Initializing Orchestrator Agent MCP...');
        // Initialize sub-agents
        this.housingAgent = new housing_agent_mcp_1.HousingAgentMCP();
        this.commuteAgent = new commute_agent_mcp_1.CommuteAgentMCP();
        this.messengerAgent = new messenger_agent_mcp_1.MessengerAgentMCP();
        await this.housingAgent.initializeMCP();
        await this.commuteAgent.initializeMCP();
        await this.messengerAgent.initialize();
        // Create MCP clients for each agent
        this.housingClient = new mcp_base_agent_1.MCPAgentClient(this.housingAgent, this.agentName);
        this.commuteClient = new mcp_base_agent_1.MCPAgentClient(this.commuteAgent, this.agentName);
        this.messengerClient = new mcp_base_agent_1.MCPAgentClient(this.messengerAgent, this.agentName);
        // Register available agents
        this.availableAgents.set('housing', this.housingClient);
        this.availableAgents.set('commute', this.commuteClient);
        this.availableAgents.set('messenger', this.messengerClient);
        console.log('🎭 Orchestrator MCP initialized with agents:', Array.from(this.availableAgents.keys()));
        // Discover capabilities from all agents
        await this.discoverAgentCapabilities();
        this.wrapMethodsWithWeave();
    }
    wrapMethodsWithWeave() {
        if (process.env.WEAVE_API_KEY) {
            // Wrap key orchestration methods with Weave tracking
            this.analyzeQuery = weave.op(this.analyzeQuery.bind(this), {
                name: 'query_analysis'
            });
            this.orchestrateSearch = weave.op(this.orchestrateSearch.bind(this), {
                name: 'search_orchestration'
            });
            this.executeCombinedSearch = weave.op(this.executeCombinedSearch.bind(this), {
                name: 'combined_search_execution'
            });
        }
    }
    getMCPTools() {
        return [
            {
                name: 'analyze_query',
                description: 'Analyze a user query and determine intent and required actions',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'User query to analyze'
                        }
                    },
                    required: ['query']
                }
            },
            {
                name: 'orchestrate_search',
                description: 'Orchestrate a complete search using multiple agents based on user requirements',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Natural language search query'
                        },
                        workLocation: {
                            type: 'string',
                            description: 'Work location for commute analysis (optional)'
                        },
                        housingFilters: {
                            type: 'object',
                            description: 'Housing search filters'
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum results to return',
                            default: 5
                        }
                    },
                    required: ['query']
                }
            },
            {
                name: 'get_agent_capabilities',
                description: 'Get capabilities of all available agents',
                inputSchema: {
                    type: 'object',
                    properties: {
                        agentName: {
                            type: 'string',
                            description: 'Specific agent name (optional, returns all if not specified)'
                        }
                    }
                }
            },
            {
                name: 'call_agent_tool',
                description: 'Call a specific tool on a specific agent',
                inputSchema: {
                    type: 'object',
                    properties: {
                        agentName: {
                            type: 'string',
                            description: 'Name of the agent to call'
                        },
                        toolName: {
                            type: 'string',
                            description: 'Name of the tool to call'
                        },
                        arguments: {
                            type: 'object',
                            description: 'Arguments to pass to the tool'
                        }
                    },
                    required: ['agentName', 'toolName', 'arguments']
                }
            },
            {
                name: 'draft_message',
                description: 'Draft a message for a specific housing listing',
                inputSchema: {
                    type: 'object',
                    properties: {
                        listingId: {
                            type: 'string',
                            description: 'The ID of the listing to message about'
                        },
                        userMessage: {
                            type: 'string',
                            description: 'Optional custom message from the user'
                        },
                        includeQuestions: {
                            type: 'boolean',
                            description: 'Whether to include relevant questions about the listing'
                        }
                    },
                    required: ['listingId']
                }
            },
            {
                name: 'send_facebook_message',
                description: 'Send a message to a Facebook Marketplace listing',
                inputSchema: {
                    type: 'object',
                    properties: {
                        listingId: {
                            type: 'string',
                            description: 'The ID of the Facebook listing to message'
                        },
                        message: {
                            type: 'string',
                            description: 'The message to send'
                        }
                    },
                    required: ['listingId', 'message']
                }
            },
            {
                name: 'get_listing_details',
                description: 'Get details for a specific listing by ID',
                inputSchema: {
                    type: 'object',
                    properties: {
                        listingId: {
                            type: 'string',
                            description: 'The ID of the listing to get details for'
                        }
                    },
                    required: ['listingId']
                }
            },
            {
                name: 'facebook_login',
                description: 'Perform Facebook login using local browser and save session',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'check_facebook_session',
                description: 'Check if a valid Facebook session exists',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'clear_facebook_session',
                description: 'Clear the saved Facebook session',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        ];
    }
    registerMCPToolHandlers() {
        this.registerMCPTool('analyze_query', async (args) => {
            const { query } = args;
            try {
                const analysis = await this.analyzeQuery(query);
                return this.createMCPJSONResult({
                    success: true,
                    analysis
                });
            }
            catch (error) {
                return this.createMCPError(`Query analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
        this.registerMCPTool('orchestrate_search', async (args) => {
            const { query, workLocation, housingFilters, maxResults = 5 } = args;
            try {
                const result = await this.orchestrateSearch(query, workLocation, housingFilters, maxResults);
                return this.createMCPJSONResult(result);
            }
            catch (error) {
                return this.createMCPError(`Search orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
        this.registerMCPTool('get_agent_capabilities', async (args) => {
            const { agentName } = args;
            try {
                const capabilities = await this.getAgentCapabilities(agentName);
                return this.createMCPJSONResult({
                    success: true,
                    capabilities
                });
            }
            catch (error) {
                return this.createMCPError(`Failed to get capabilities: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
        this.registerMCPTool('call_agent_tool', async (args) => {
            const { agentName, toolName, arguments: toolArgs } = args;
            try {
                const result = await this.callAgentTool(agentName, toolName, toolArgs);
                return this.createMCPJSONResult({
                    success: true,
                    result
                });
            }
            catch (error) {
                return this.createMCPError(`Agent tool call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
        // Messaging tools
        this.registerMCPTool('draft_message', async (args) => {
            const { listingId, userMessage, includeQuestions = true } = args;
            try {
                if (!this.messengerClient) {
                    throw new Error('Messenger agent not initialized');
                }
                const result = await this.messengerClient.callTool('draft_message', {
                    listingId,
                    userMessage,
                    includeQuestions
                });
                return this.createMCPJSONResult(result);
            }
            catch (error) {
                return this.createMCPError(`Message drafting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
        this.registerMCPTool('send_facebook_message', async (args) => {
            const { listingId, message } = args;
            try {
                if (!this.messengerClient) {
                    throw new Error('Messenger agent not initialized');
                }
                const result = await this.messengerClient.callTool('send_facebook_message', {
                    listingId,
                    message
                });
                return this.createMCPJSONResult(result);
            }
            catch (error) {
                return this.createMCPError(`Message sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
        this.registerMCPTool('get_listing_details', async (args) => {
            const { listingId } = args;
            try {
                if (!this.messengerClient) {
                    throw new Error('Messenger agent not initialized');
                }
                const result = await this.messengerClient.callTool('get_listing_details', {
                    listingId
                });
                return this.createMCPJSONResult(result);
            }
            catch (error) {
                return this.createMCPError(`Getting listing details failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
        // Session management tools
        this.registerMCPTool('facebook_login', async (args) => {
            try {
                if (!this.messengerClient) {
                    throw new Error('Messenger agent not initialized');
                }
                const result = await this.messengerClient.callTool('facebook_login', {});
                return this.createMCPJSONResult(result);
            }
            catch (error) {
                return this.createMCPError(`Facebook login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
        this.registerMCPTool('check_facebook_session', async (args) => {
            try {
                if (!this.messengerClient) {
                    throw new Error('Messenger agent not initialized');
                }
                const result = await this.messengerClient.callTool('check_facebook_session', {});
                return this.createMCPJSONResult(result);
            }
            catch (error) {
                return this.createMCPError(`Checking Facebook session failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
        this.registerMCPTool('clear_facebook_session', async (args) => {
            try {
                if (!this.messengerClient) {
                    throw new Error('Messenger agent not initialized');
                }
                const result = await this.messengerClient.callTool('clear_facebook_session', {});
                return this.createMCPJSONResult(result);
            }
            catch (error) {
                return this.createMCPError(`Clearing Facebook session failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    getCapabilities() {
        return [
            {
                name: 'query_analysis',
                description: 'Analyze user queries and determine intent',
                parameters: {
                    query: 'string'
                }
            },
            {
                name: 'multi_agent_orchestration',
                description: 'Orchestrate multiple agents to fulfill complex requests',
                parameters: {
                    query: 'string',
                    agents: 'array'
                }
            }
        ];
    }
    async discoverAgentCapabilities() {
        console.log('🔍 Discovering agent capabilities...');
        for (const [agentName, client] of this.availableAgents) {
            try {
                const tools = await client.listTools();
                console.log(`📋 ${agentName}: ${tools.map(t => t.name).join(', ')}`);
            }
            catch (error) {
                console.log(`⚠️ Could not discover capabilities for ${agentName}:`, error);
            }
        }
    }
    async analyzeQuery(query) {
        console.log(`🎭 Analyzing query: "${query}"`);
        const analysisPrompt = `
Analyze this user query for a housing search application and determine the intent and required actions.

Query: "${query}"

Determine:
1. Primary intent: housing_search, commute_analysis, combined_search, market_summary, message_request, or session_management
2. Confidence level (0-1)
3. Housing criteria if relevant
4. Commute criteria if relevant
5. Session action if relevant
6. Reasoning for the classification

Use "message_request" intent when the user wants to draft or send a message to a housing listing (contains words like "message", "send", "draft", "contact", "write" along with a listing ID or reference).

Use "session_management" intent when the user wants to manage Facebook login sessions (contains words like "login", "facebook_login", "check_facebook_session", "clear_facebook_session", "facebook", "session", "logout", "sign in", "authenticate").

For session_management, determine the sessionAction:
- "login" for facebook_login, login, sign in, authenticate
- "check" for check_facebook_session, check session, session status
- "clear" for clear_facebook_session, logout, sign out, clear session

Respond with ONLY a JSON object:
{
  "intent": "combined_search",
  "confidence": 0.9,
  "housingCriteria": {
    "query": "extracted housing preferences",
    "filters": {
      "maxPrice": 2000,
      "privateRoom": true
    },
    "maxResults": 5
  },
  "commuteCriteria": {
    "workLocation": "extracted work location",
    "travelMode": "driving-traffic",
    "maxDistance": 50000,
    "maxTime": 3600
  },
  "sessionAction": "login",
  "reasoning": "User wants housing with commute consideration"
}
`;
        try {
            const response = await this.makeAIDecision(analysisPrompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                console.log(`🎯 Intent: ${analysis.intent} (confidence: ${analysis.confidence})`);
                return analysis;
            }
            throw new Error('Could not parse analysis response');
        }
        catch (error) {
            console.error('❌ Query analysis failed:', error);
            // Fallback analysis
            return {
                intent: 'housing_search',
                confidence: 0.5,
                housingCriteria: {
                    query,
                    maxResults: 5
                },
                reasoning: 'Fallback analysis due to parsing error'
            };
        }
    }
    async orchestrateSearch(query, workLocation, housingFilters, maxResults = 5) {
        console.log(`🎭 Orchestrating search for: "${query}"`);
        // Analyze the query first
        const analysis = await this.analyzeQuery(query);
        const agentsUsed = [];
        try {
            switch (analysis.intent) {
                case 'housing_search':
                    return await this.executeHousingSearch(query, analysis, agentsUsed, housingFilters, maxResults);
                case 'combined_search':
                    return await this.executeCombinedSearch(query, analysis, agentsUsed, workLocation, housingFilters, maxResults);
                case 'commute_analysis':
                    return await this.executeCommuteAnalysis(analysis, agentsUsed, workLocation);
                case 'market_summary':
                    return await this.executeMarketSummary(agentsUsed);
                case 'message_request':
                    return await this.executeMessageRequest(query, analysis, agentsUsed);
                case 'session_management':
                    return await this.executeSessionManagement(analysis, agentsUsed);
                default:
                    return {
                        success: false,
                        intent: analysis.intent,
                        reasoning: `Unknown intent: ${analysis.intent}`,
                        agentsUsed
                    };
            }
        }
        catch (error) {
            return {
                success: false,
                intent: analysis.intent,
                reasoning: `Orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                agentsUsed
            };
        }
    }
    async executeHousingSearch(originalQuery, analysis, agentsUsed, housingFilters, maxResults = 5) {
        agentsUsed.push('housing');
        if (!this.housingClient) {
            throw new Error('Housing agent not available');
        }
        const searchArgs = {
            query: analysis.housingCriteria?.query || originalQuery,
            filters: housingFilters || analysis.housingCriteria?.filters || {},
            maxResults
        };
        const result = await this.housingClient.callTool('search_housing', searchArgs);
        const resultData = JSON.parse(result.content[0].text);
        return {
            success: resultData.success,
            intent: analysis.intent,
            results: resultData.results,
            housingResults: resultData.results,
            reasoning: `Found ${resultData.count} housing matches`,
            agentsUsed
        };
    }
    async executeCombinedSearch(originalQuery, analysis, agentsUsed, workLocation, housingFilters, maxResults = 5) {
        agentsUsed.push('housing', 'commute');
        if (!this.housingClient || !this.commuteClient) {
            throw new Error('Required agents not available');
        }
        // First get housing results
        const housingArgs = {
            query: analysis.housingCriteria?.query || originalQuery,
            filters: housingFilters || analysis.housingCriteria?.filters || {},
            maxResults
        };
        const housingResult = await this.housingClient.callTool('search_housing', housingArgs);
        const housingData = JSON.parse(housingResult.content[0].text);
        if (!housingData.success || !housingData.results?.length) {
            return {
                success: false,
                intent: analysis.intent,
                reasoning: 'No housing results found',
                agentsUsed
            };
        }
        // Then analyze commutes for each housing result
        const workLoc = workLocation || analysis.commuteCriteria?.workLocation;
        if (!workLoc) {
            return {
                success: true,
                intent: analysis.intent,
                results: housingData.results,
                housingResults: housingData.results,
                reasoning: 'Housing search completed without commute analysis (no work location)',
                agentsUsed: ['housing']
            };
        }
        const enhancedResults = await Promise.all(housingData.results.map(async (housingMatch) => {
            try {
                const commuteArgs = {
                    homeLocation: {
                        address: housingMatch.listing.location,
                        coordinates: housingMatch.listing.coordinates
                    },
                    workLocation: {
                        address: workLoc
                    },
                    travelMode: analysis.commuteCriteria?.travelMode || 'driving-traffic'
                };
                const commuteResult = await this.commuteClient.callTool('analyze_commute', commuteArgs);
                const commuteData = JSON.parse(commuteResult.content[0].text);
                if (commuteData.success) {
                    const commuteScore = commuteData.analysis.rating * 10; // Convert to percentage
                    const housingScore = housingMatch.matchPercentage;
                    const combinedScore = Math.round((housingScore * 0.6) + (commuteScore * 0.4));
                    return {
                        ...housingMatch,
                        commuteAnalysis: commuteData.analysis,
                        combinedScore,
                        scores: {
                            housing: housingScore,
                            commute: commuteScore,
                            combined: combinedScore
                        }
                    };
                }
                else {
                    return {
                        ...housingMatch,
                        combinedScore: housingMatch.matchPercentage,
                        scores: {
                            housing: housingMatch.matchPercentage
                        }
                    };
                }
            }
            catch (error) {
                console.log(`⚠️ Commute analysis failed for ${housingMatch.listing.location}`);
                return {
                    ...housingMatch,
                    combinedScore: housingMatch.matchPercentage,
                    scores: {
                        housing: housingMatch.matchPercentage
                    }
                };
            }
        }));
        // Sort by combined score
        enhancedResults.sort((a, b) => (b.combinedScore || 0) - (a.combinedScore || 0));
        return {
            success: true,
            intent: analysis.intent,
            results: enhancedResults,
            housingResults: housingData.results,
            reasoning: `Combined search completed with ${enhancedResults.length} enhanced results`,
            agentsUsed
        };
    }
    async executeCommuteAnalysis(analysis, agentsUsed, workLocation) {
        agentsUsed.push('commute');
        if (!this.commuteClient) {
            throw new Error('Commute agent not available');
        }
        // Extract locations from the analysis
        const workLoc = workLocation || analysis.commuteCriteria?.workLocation;
        if (!workLoc) {
            throw new Error('Work location required for commute analysis');
        }
        // For pure commute analysis, we'd need home locations from the query
        // This is a simplified implementation
        return {
            success: false,
            intent: analysis.intent,
            reasoning: 'Pure commute analysis not yet implemented - need home locations',
            agentsUsed
        };
    }
    async executeMarketSummary(agentsUsed) {
        agentsUsed.push('housing');
        if (!this.housingClient) {
            throw new Error('Housing agent not available');
        }
        const result = await this.housingClient.callTool('get_housing_summary', { source: 'all' });
        const summaryData = JSON.parse(result.content[0].text);
        return {
            success: true,
            intent: 'market_summary',
            results: summaryData,
            reasoning: 'Market summary generated',
            agentsUsed
        };
    }
    async executeMessageRequest(query, analysis, agentsUsed) {
        console.log('🎭 Executing message request...');
        agentsUsed.push('messenger');
        try {
            if (!this.messengerClient) {
                throw new Error('Messenger agent not initialized');
            }
            // Extract listing ID from query using AI
            const listingIdMatch = query.match(/\b\d{10,}\b/); // Look for long numbers (listing IDs)
            if (!listingIdMatch) {
                return {
                    success: false,
                    intent: 'message_request',
                    reasoning: 'Could not extract listing ID from query. Please provide a listing ID.',
                    agentsUsed
                };
            }
            const listingId = listingIdMatch[0];
            // Check if this is a draft or send request
            const isDraftRequest = query.toLowerCase().includes('draft') || query.toLowerCase().includes('write') || query.toLowerCase().includes('prepare');
            const isSendRequest = query.toLowerCase().includes('send') || query.toLowerCase().includes('message');
            if (isDraftRequest || (!isSendRequest && !query.toLowerCase().includes('send'))) {
                // Draft message
                const result = await this.messengerClient.callTool('draft_message', {
                    listingId,
                    includeQuestions: true
                });
                return {
                    success: true,
                    intent: 'message_request',
                    results: result,
                    reasoning: 'Message drafted successfully. Use send_facebook_message to send it.',
                    agentsUsed
                };
            }
            else if (isSendRequest) {
                // Need to extract or generate message
                let message = '';
                // Try to extract custom message from query
                const messageMatch = query.match(/["']([^"']+)["']/);
                if (messageMatch) {
                    message = messageMatch[1];
                }
                else {
                    // First draft the message
                    const draftResult = await this.messengerClient.callTool('draft_message', {
                        listingId,
                        includeQuestions: true
                    });
                    if (draftResult.content && draftResult.content[0] && draftResult.content[0].text) {
                        const draftData = JSON.parse(draftResult.content[0].text);
                        message = draftData.draftedMessage;
                    }
                    else {
                        throw new Error('Failed to draft message');
                    }
                }
                // Send the message
                const result = await this.messengerClient.callTool('send_facebook_message', {
                    listingId,
                    message
                });
                return {
                    success: true,
                    intent: 'message_request',
                    results: result,
                    reasoning: 'Message sent successfully via Facebook Messenger',
                    agentsUsed
                };
            }
            else {
                return {
                    success: false,
                    intent: 'message_request',
                    reasoning: 'Please specify whether you want to draft or send a message',
                    agentsUsed
                };
            }
        }
        catch (error) {
            return {
                success: false,
                intent: 'message_request',
                reasoning: `Message request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                agentsUsed
            };
        }
    }
    async executeSessionManagement(analysis, agentsUsed) {
        console.log('🎭 Executing session management...');
        agentsUsed.push('messenger');
        try {
            if (!this.messengerClient) {
                throw new Error('Messenger agent not initialized');
            }
            const { sessionAction } = analysis;
            if (!sessionAction) {
                throw new Error('No session action specified');
            }
            let toolName;
            let successMessage;
            switch (sessionAction) {
                case 'login':
                    toolName = 'facebook_login';
                    successMessage = 'Facebook login completed successfully. Session saved for future use.';
                    break;
                case 'check':
                    toolName = 'check_facebook_session';
                    successMessage = 'Facebook session status checked.';
                    break;
                case 'clear':
                    toolName = 'clear_facebook_session';
                    successMessage = 'Facebook session cleared successfully.';
                    break;
                default:
                    throw new Error(`Unknown session action: ${sessionAction}`);
            }
            console.log(`🔧 Calling ${toolName}...`);
            const result = await this.messengerClient.callTool(toolName, {});
            return {
                success: true,
                intent: 'session_management',
                results: result,
                reasoning: successMessage,
                agentsUsed
            };
        }
        catch (error) {
            return {
                success: false,
                intent: 'session_management',
                reasoning: `Session management failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                agentsUsed
            };
        }
    }
    async getAgentCapabilities(agentName) {
        if (agentName) {
            const client = this.availableAgents.get(agentName);
            if (!client) {
                throw new Error(`Agent ${agentName} not found`);
            }
            const tools = await client.listTools();
            const capabilities = await client.getCapabilities();
            return {
                agentName,
                tools,
                capabilities
            };
        }
        else {
            const allCapabilities = {};
            for (const [name, client] of this.availableAgents) {
                try {
                    const tools = await client.listTools();
                    const capabilities = await client.getCapabilities();
                    allCapabilities[name] = {
                        tools,
                        capabilities
                    };
                }
                catch (error) {
                    allCapabilities[name] = {
                        error: `Failed to get capabilities: ${error instanceof Error ? error.message : 'Unknown error'}`
                    };
                }
            }
            return allCapabilities;
        }
    }
    async callAgentTool(agentName, toolName, args) {
        const client = this.availableAgents.get(agentName);
        if (!client) {
            throw new Error(`Agent ${agentName} not found`);
        }
        const result = await client.callTool(toolName, args);
        return result;
    }
    // Public methods for backward compatibility
    async processQuery(query) {
        return await this.orchestrateSearch(query);
    }
}
exports.OrchestratorAgentMCP = OrchestratorAgentMCP;
