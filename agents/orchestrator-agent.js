"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorAgent = void 0;
exports.testOrchestratorAgent = testOrchestratorAgent;
const base_agent_1 = require("./base-agent");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
class OrchestratorAgent extends base_agent_1.BaseAgent {
    constructor() {
        super('OrchestratorAgent');
        this.setupOrchestratorHandlers();
    }
    async initialize() {
        console.log('🎭 Orchestrator Agent initializing...');
        console.log('✅ Orchestrator Agent ready');
    }
    getCapabilities() {
        return [
            {
                name: 'analyze_query',
                description: 'Analyze user query to understand intent and extract parameters',
                parameters: {
                    query: 'string - User query to analyze'
                }
            },
            {
                name: 'create_orchestration_plan',
                description: 'Create execution plan for which agents to invoke and how',
                parameters: {
                    queryAnalysis: 'QueryAnalysis - Analysis of user query'
                }
            },
            {
                name: 'coordinate_agents',
                description: 'Coordinate multiple agents to fulfill user request',
                parameters: {
                    query: 'string - User query',
                    availableAgents: 'string[] - List of available agent names'
                }
            }
        ];
    }
    setupOrchestratorHandlers() {
        this.registerHandler('analyze_query', this.handleAnalyzeQuery.bind(this));
        this.registerHandler('create_orchestration_plan', this.handleCreateOrchestrationPlan.bind(this));
        this.registerHandler('coordinate_agents', this.handleCoordinateAgents.bind(this));
    }
    async handleAnalyzeQuery(message) {
        try {
            const { query } = message.payload;
            const analysis = await this.analyzeQuery(query);
            return {
                success: true,
                data: analysis,
                confidence: analysis.confidence
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Query analysis failed'
            };
        }
    }
    async handleCreateOrchestrationPlan(message) {
        try {
            const { queryAnalysis } = message.payload;
            const plan = await this.createOrchestrationPlan(queryAnalysis);
            return {
                success: true,
                data: plan,
                confidence: 0.9
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Orchestration planning failed'
            };
        }
    }
    async handleCoordinateAgents(message) {
        try {
            const { query, availableAgents } = message.payload;
            const coordination = await this.coordinateAgents(query, availableAgents);
            return {
                success: true,
                data: coordination,
                confidence: 0.9
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Agent coordination failed'
            };
        }
    }
    async analyzeQuery(query) {
        console.log(`🔍 Analyzing query: "${query}"`);
        const prompt = `
Analyze this user query for a housing search system and extract the intent and parameters:

Query: "${query}"

Determine:
1. Primary intent (housing_search, commute_analysis, market_summary, or combined_search)
2. Housing criteria (if any)
3. Commute criteria (if any)
4. Confidence level (0-1)

Respond with ONLY a JSON object:
{
  "intent": "housing_search|commute_analysis|market_summary|combined_search",
  "housingCriteria": {
    "query": "cleaned housing search query",
    "filters": {
      "minPrice": number or null,
      "maxPrice": number or null,
      "minBedrooms": number or null,
      "maxBedrooms": number or null,
      "housingType": "house|apartment|condo" or null,
      "privateRoom": boolean or null,
      "privateBath": boolean or null,
      "smoking": boolean or null
    }
  },
  "commuteCriteria": {
    "workLocation": "extracted work/destination location",
    "travelMode": "driving|walking|bicycling|transit" or null,
    "maxDistance": number or null,
    "maxTime": number or null
  },
  "confidence": 0.95,
  "explanation": "Brief explanation of the analysis"
}

Examples:
- "Find apartments under $2000" → intent: "housing_search", no commute criteria
- "Places with easy commute to Stanford" → intent: "combined_search", workLocation: "Stanford"
- "Show me market summary" → intent: "market_summary"
- "Rooms near 123 Main St with private bath" → intent: "combined_search", workLocation: "123 Main St"

Extract work locations from patterns like:
- "commute to X", "close to X", "near X", "work at X"
- Street addresses (e.g., "230 Bay Pl", "123 Main Street")
- Company names, universities, landmarks
`;
        try {
            const response = await this.makeAIDecision(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                console.log(`📊 Analysis: ${analysis.intent} (confidence: ${analysis.confidence})`);
                if (analysis.commuteCriteria?.workLocation) {
                    console.log(`🎯 Work location detected: "${analysis.commuteCriteria.workLocation}"`);
                }
                return analysis;
            }
            throw new Error('No valid JSON found in analysis response');
        }
        catch (error) {
            console.error('❌ Query analysis failed:', error);
            // Fallback analysis
            return {
                intent: 'housing_search',
                housingCriteria: {
                    query: query,
                    filters: {}
                },
                confidence: 0.3,
                explanation: 'Fallback analysis due to parsing error'
            };
        }
    }
    async createOrchestrationPlan(analysis) {
        console.log(`🎭 Creating orchestration plan for intent: ${analysis.intent}`);
        const plan = {
            agentsToInvoke: [],
            executionOrder: 'sequential',
            parameters: {},
            reasoning: ''
        };
        switch (analysis.intent) {
            case 'housing_search':
                plan.agentsToInvoke = ['HousingAgent'];
                plan.parameters.HousingAgent = {
                    action: 'search_listings',
                    payload: { query: analysis.housingCriteria?.query }
                };
                plan.reasoning = 'Pure housing search - only housing agent needed';
                break;
            case 'commute_analysis':
                plan.agentsToInvoke = ['TomTomCommuteAgent'];
                plan.parameters.TomTomCommuteAgent = {
                    action: 'commute_analysis',
                    payload: {
                        homeLocation: { address: 'user_provided' },
                        workLocation: { address: analysis.commuteCriteria?.workLocation },
                        travelMode: analysis.commuteCriteria?.travelMode || 'driving'
                    }
                };
                plan.reasoning = 'Pure commute analysis - only commute agent needed';
                break;
            case 'market_summary':
                plan.agentsToInvoke = ['HousingAgent'];
                plan.parameters.HousingAgent = {
                    action: 'get_summary',
                    payload: {}
                };
                plan.reasoning = 'Market summary request - housing agent summary';
                break;
            case 'combined_search':
                plan.agentsToInvoke = ['HousingAgent', 'TomTomCommuteAgent'];
                plan.executionOrder = 'sequential'; // Housing first, then commute analysis
                plan.parameters.HousingAgent = {
                    action: 'search_listings',
                    payload: { query: analysis.housingCriteria?.query }
                };
                plan.parameters.TomTomCommuteAgent = {
                    action: 'commute_analysis',
                    payload: {
                        workLocation: { address: analysis.commuteCriteria?.workLocation },
                        travelMode: analysis.commuteCriteria?.travelMode || 'driving'
                    }
                };
                plan.reasoning = 'Combined search - housing listings with commute analysis';
                break;
        }
        console.log(`📋 Plan: ${plan.agentsToInvoke.join(' + ')} (${plan.executionOrder})`);
        return plan;
    }
    async coordinateAgents(query, availableAgents) {
        // Step 1: Analyze the query
        const analysis = await this.analyzeQuery(query);
        // Step 2: Create orchestration plan
        const plan = await this.createOrchestrationPlan(analysis);
        // Step 3: Validate agents are available
        const unavailableAgents = plan.agentsToInvoke.filter(agent => !availableAgents.includes(agent));
        const recommendations = [];
        if (unavailableAgents.length > 0) {
            recommendations.push(`⚠️ Agents not available: ${unavailableAgents.join(', ')}`);
        }
        if (analysis.confidence < 0.7) {
            recommendations.push(`⚠️ Low confidence in query analysis (${analysis.confidence}). Consider rephrasing.`);
        }
        if (analysis.intent === 'combined_search' && !analysis.commuteCriteria?.workLocation) {
            recommendations.push(`⚠️ Combined search requested but no work location detected.`);
        }
        return {
            analysis,
            plan,
            recommendations
        };
    }
    // Public method for testing
    async testOrchestration(query) {
        console.log('🧪 Testing Orchestrator Agent...');
        const availableAgents = ['HousingAgent', 'TomTomCommuteAgent'];
        const result = await this.coordinateAgents(query, availableAgents);
        console.log('\n📊 Orchestration Result:');
        console.log('Analysis:', result.analysis);
        console.log('Plan:', result.plan);
        console.log('Recommendations:', result.recommendations);
    }
}
exports.OrchestratorAgent = OrchestratorAgent;
// Standalone function for testing
async function testOrchestratorAgent() {
    console.log('🧪 Testing Orchestrator Agent...');
    const agent = new OrchestratorAgent();
    await agent.initialize();
    // Test various queries
    const testQueries = [
        'Find apartments under $2000',
        'Places with easy commute to 230 Bay Pl',
        'Show me market summary',
        'Rooms near Stanford University with private bath',
        'Female roommates who like to cook close to downtown'
    ];
    for (const query of testQueries) {
        console.log(`\n🔍 Testing: "${query}"`);
        await agent.testOrchestration(query);
    }
}
// Run test if executed directly
if (require.main === module) {
    testOrchestratorAgent().catch(console.error);
}
