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
const weave = __importStar(require("weave"));
class OrchestratorAgentMCP extends mcp_base_agent_1.MCPBaseAgent {
    constructor() {
        super('OrchestratorAgentMCP', 'gpt-4o');
        this.housingAgent = null;
        this.commuteAgent = null;
        this.housingClient = null;
        this.commuteClient = null;
        this.availableAgents = new Map();
    }
    async initialize() {
        console.log('🎭 Initializing Orchestrator Agent MCP...');
        // Initialize sub-agents
        this.housingAgent = new housing_agent_mcp_1.HousingAgentMCP();
        this.commuteAgent = new commute_agent_mcp_1.CommuteAgentMCP();
        await this.housingAgent.initializeMCP();
        await this.commuteAgent.initializeMCP();
        // Create MCP clients for each agent
        this.housingClient = new mcp_base_agent_1.MCPAgentClient(this.housingAgent, this.agentName);
        this.commuteClient = new mcp_base_agent_1.MCPAgentClient(this.commuteAgent, this.agentName);
        // Register available agents
        this.availableAgents.set('housing', this.housingClient);
        this.availableAgents.set('commute', this.commuteClient);
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
1. Primary intent: housing_search, commute_analysis, combined_search, or market_summary
2. Confidence level (0-1)
3. Housing criteria if relevant
4. Commute criteria if relevant
5. Reasoning for the classification

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
