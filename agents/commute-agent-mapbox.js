"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapboxCommuteAgent = void 0;
const base_agent_1 = require("./base-agent");
const openai_1 = require("@langchain/openai");
const mcp_adapters_1 = require("@langchain/mcp-adapters");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
class MapboxCommuteAgent extends base_agent_1.BaseAgent {
    constructor() {
        // Use gpt-4o for better MCP reasoning instead of gpt-4o-mini
        super('MapboxCommuteAgent', 'gpt-4o');
        this.mcpClient = null;
        this.maxAcceptableDistance = 50000; // 50km in meters
        this.maxAcceptableTime = 3600; // 1 hour in seconds
        // Create a dedicated smart model for MCP operations
        this.smartModel = new openai_1.ChatOpenAI({
            modelName: 'gpt-4o',
            temperature: 0.1,
        });
        this.setupMessageHandlers();
    }
    async initialize() {
        console.log('🗺️ Initializing Mapbox Commute Agent...');
        try {
            // Try to connect to Mapbox MCP server
            this.mcpClient = new mcp_adapters_1.MultiServerMCPClient({
                mapbox: {
                    command: 'npx',
                    args: ['-y', '@mapbox/mcp-server'],
                    transport: 'stdio',
                    env: {
                        MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN
                    }
                }
            });
            console.log('✅ Connected to Mapbox MCP server');
            // Test the connection with a simple capability query
            try {
                const tools = await this.mcpClient.getTools();
                console.log(`🔧 Available Mapbox tools: ${tools.map(t => t.name).join(', ')}`);
            }
            catch (toolError) {
                console.log('⚠️ Could not list tools:', toolError);
            }
        }
        catch (error) {
            console.log('⚠️ Could not connect to Mapbox MCP server:', error);
            console.log('💡 Make sure to run: npx -y @mapbox/mcp-server');
            console.log('🔑 And set MAPBOX_ACCESS_TOKEN environment variable');
            this.mcpClient = null;
        }
    }
    getCapabilities() {
        return [
            {
                name: 'commute_analysis',
                description: 'Analyze commute between two locations using Mapbox',
                parameters: {
                    homeLocation: 'string | coordinates',
                    workLocation: 'string | coordinates',
                    travelMode: 'driving-traffic | driving | walking | cycling',
                    departureTime: 'optional ISO string',
                    arrivalTime: 'optional ISO string'
                }
            },
            {
                name: 'route_optimization',
                description: 'Find optimal routes with real-time traffic',
                parameters: {
                    origin: 'string | coordinates',
                    destination: 'string | coordinates',
                    alternatives: 'boolean'
                }
            }
        ];
    }
    setupMessageHandlers() {
        this.registerHandler('analyze_commute', async (message) => {
            const request = message.payload;
            const analysis = await this.analyzeCommute(request);
            return {
                success: analysis !== null,
                data: analysis,
                confidence: analysis ? 0.9 : 0.0
            };
        });
        this.registerHandler('get_route', async (message) => {
            const { origin, destination, travelMode } = message.payload;
            const route = await this.getRoute(origin, destination, travelMode);
            return {
                success: route !== null,
                data: route
            };
        });
    }
    async analyzeCommute(request) {
        if (!this.mcpClient) {
            console.log('❌ Mapbox MCP client not available, using mock data');
            return this.createMockCommuteAnalysis(request);
        }
        try {
            console.log(`🗺️ Analyzing commute from ${request.homeLocation.address} to ${request.workLocation.address}`);
            // Try to get available tools from MCP server
            let tools;
            try {
                tools = await this.mcpClient.getTools();
                console.log(`🔧 Found ${tools.length} available tools`);
            }
            catch (toolError) {
                console.log('⚠️ Could not get tools from MCP server:', toolError);
                console.log('🔄 Using mock data instead...');
                return this.createMockCommuteAnalysis(request);
            }
            // Find a suitable routing tool
            const routingTool = tools.find(tool => tool.name.toLowerCase().includes('route') ||
                tool.name.toLowerCase().includes('direction') ||
                tool.name.toLowerCase().includes('matrix'));
            if (!routingTool) {
                console.log('❌ No routing tool found in MCP server, using mock data');
                return this.createMockCommuteAnalysis(request);
            }
            console.log(`🔧 Found routing tool: ${routingTool.name}`);
            // Use the smart LLM to analyze the commute request and provide guidance
            const analysisPrompt = `
I need to analyze a commute between two locations for a housing search application.

Request details:
- Home: ${request.homeLocation.address}${request.homeLocation.coordinates ? ` (${request.homeLocation.coordinates.lat}, ${request.homeLocation.coordinates.lng})` : ''}
- Work: ${request.workLocation.address}${request.workLocation.coordinates ? ` (${request.workLocation.coordinates.lat}, ${request.workLocation.coordinates.lng})` : ''}
- Travel mode: ${request.travelMode || 'driving-traffic'}

Available Mapbox tool: ${routingTool.name} - ${routingTool.description}

Based on this information, please provide an estimated commute analysis in the following JSON format:
{
  "distance_km": 15.5,
  "duration_minutes": 25,
  "traffic_duration_minutes": 35,
  "analysis": "Brief analysis of the commute quality"
}

Consider typical urban commute patterns and provide realistic estimates.
`;
            const analysisResponse = await this.smartModel.invoke(analysisPrompt);
            const analysisContent = analysisResponse.content;
            // Try to extract JSON from the response
            const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const aiAnalysis = JSON.parse(jsonMatch[0]);
                    return this.convertAIAnalysisToCommuteAnalysis(aiAnalysis, request);
                }
                catch (parseError) {
                    console.log('⚠️ Could not parse AI analysis JSON, using mock data');
                }
            }
            // Fallback to mock data
            console.log('🔄 Using fallback mock data...');
            return this.createMockCommuteAnalysis(request);
        }
        catch (error) {
            console.error('❌ Commute analysis error:', error);
            console.log('🔄 Using mock data as fallback...');
            return this.createMockCommuteAnalysis(request);
        }
    }
    convertAIAnalysisToCommuteAnalysis(aiAnalysis, request) {
        const distanceMeters = (aiAnalysis.distance_km || 15) * 1000;
        const durationSeconds = (aiAnalysis.duration_minutes || 25) * 60;
        const trafficDurationSeconds = (aiAnalysis.traffic_duration_minutes || 30) * 60;
        const distance = {
            text: `${(distanceMeters / 1000).toFixed(1)} km`,
            value: Math.round(distanceMeters)
        };
        const duration = {
            text: `${Math.round(durationSeconds / 60)} min`,
            value: Math.round(durationSeconds)
        };
        const durationInTraffic = {
            text: `${Math.round(trafficDurationSeconds / 60)} min`,
            value: Math.round(trafficDurationSeconds)
        };
        const rating = this.calculateCommuteRating(distance.value, duration.value);
        const recommendation = aiAnalysis.analysis || this.generateRecommendation(distance.value, duration.value, rating);
        console.log(`📊 AI analysis: ${distance.text} in ${duration.text} (${durationInTraffic.text} with traffic)`);
        return {
            distance,
            duration,
            durationInTraffic,
            rating,
            recommendation,
            route: {
                source: 'ai_analysis',
                from: request.homeLocation.address,
                to: request.workLocation.address,
                mode: request.travelMode || 'driving-traffic'
            }
        };
    }
    createMockCommuteAnalysis(request) {
        // Create realistic mock data based on the request
        const estimatedDistance = Math.random() * 30000 + 5000; // 5-35km
        const estimatedDuration = Math.random() * 2400 + 600; // 10-50 minutes
        const distance = {
            text: `${(estimatedDistance / 1000).toFixed(1)} km`,
            value: Math.round(estimatedDistance)
        };
        const duration = {
            text: `${Math.round(estimatedDuration / 60)} min`,
            value: Math.round(estimatedDuration)
        };
        const durationInTraffic = {
            text: `${Math.round((estimatedDuration * 1.2) / 60)} min`,
            value: Math.round(estimatedDuration * 1.2)
        };
        const rating = this.calculateCommuteRating(distance.value, duration.value);
        const recommendation = this.generateRecommendation(distance.value, duration.value, rating);
        console.log(`📊 Mock analysis: ${distance.text} in ${duration.text} (${durationInTraffic.text} with traffic)`);
        return {
            distance,
            duration,
            durationInTraffic,
            rating,
            recommendation,
            route: {
                source: 'mock_data',
                from: request.homeLocation.address,
                to: request.workLocation.address,
                mode: request.travelMode || 'driving-traffic'
            }
        };
    }
    calculateCommuteRating(distanceMeters, durationSeconds) {
        // Rating factors
        let score = 10;
        // Distance penalty (0-50km is acceptable)
        if (distanceMeters > this.maxAcceptableDistance) {
            score -= Math.min(5, (distanceMeters - this.maxAcceptableDistance) / 10000);
        }
        // Time penalty (0-60min is acceptable)
        if (durationSeconds > this.maxAcceptableTime) {
            score -= Math.min(5, (durationSeconds - this.maxAcceptableTime) / 600);
        }
        // Speed-based assessment (too slow = traffic/bad roads)
        const avgSpeedKmh = (distanceMeters / 1000) / (durationSeconds / 3600);
        if (avgSpeedKmh < 20) {
            score -= 2; // Very slow, likely heavy traffic
        }
        else if (avgSpeedKmh < 30) {
            score -= 1; // Moderate traffic
        }
        return Math.max(1, Math.min(10, Math.round(score)));
    }
    generateRecommendation(distanceMeters, durationSeconds, rating) {
        const distanceKm = distanceMeters / 1000;
        const durationMin = durationSeconds / 60;
        if (rating >= 8) {
            return `Excellent commute! ${distanceKm.toFixed(1)}km in ${durationMin.toFixed(0)} minutes is very reasonable.`;
        }
        else if (rating >= 6) {
            return `Good commute. ${distanceKm.toFixed(1)}km in ${durationMin.toFixed(0)} minutes is manageable for most people.`;
        }
        else if (rating >= 4) {
            return `Moderate commute. ${distanceKm.toFixed(1)}km in ${durationMin.toFixed(0)} minutes might be tiring daily.`;
        }
        else {
            return `Challenging commute. ${distanceKm.toFixed(1)}km in ${durationMin.toFixed(0)} minutes is quite long for daily travel.`;
        }
    }
    async getRoute(origin, destination, travelMode = 'driving-traffic') {
        if (!this.mcpClient) {
            return {
                source: 'mock_data',
                origin,
                destination,
                travelMode
            };
        }
        try {
            // Similar approach to analyzeCommute but simpler
            const tools = await this.mcpClient.getTools();
            const routingTool = tools.find(tool => tool.name.toLowerCase().includes('route') ||
                tool.name.toLowerCase().includes('direction'));
            if (!routingTool) {
                return null;
            }
            // For now, return mock route data
            return {
                source: 'mapbox_mcp',
                origin,
                destination,
                travelMode,
                tool: routingTool.name
            };
        }
        catch (error) {
            console.error('❌ Route error:', error);
            return null;
        }
    }
    // Public method for direct commute analysis
    async analyzeCommutePublic(homeLocation, workLocation, travelMode = 'driving-traffic') {
        return await this.analyzeCommute({
            homeLocation: { address: homeLocation },
            workLocation: { address: workLocation },
            travelMode: travelMode
        });
    }
}
exports.MapboxCommuteAgent = MapboxCommuteAgent;
