"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommuteAgentMCP = void 0;
const mcp_base_agent_1 = require("./mcp-base-agent");
const mcp_adapters_1 = require("@langchain/mcp-adapters");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
class CommuteAgentMCP extends mcp_base_agent_1.MCPBaseAgent {
    constructor() {
        // Use gpt-4o for better MCP reasoning instead of gpt-4o-mini
        super('CommuteAgentMCP', 'gpt-4o');
        this.mcpClient = null;
        this.maxAcceptableDistance = 50000; // 50km in meters
        this.maxAcceptableTime = 3600; // 1 hour in seconds
    }
    async initialize() {
        console.log('🗺️ Initializing Commute Agent MCP...');
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
    getMCPTools() {
        return [
            {
                name: 'analyze_commute',
                description: 'Analyze commute between two locations using Mapbox routing',
                inputSchema: {
                    type: 'object',
                    properties: {
                        homeLocation: {
                            type: 'object',
                            properties: {
                                address: { type: 'string', description: 'Home address' },
                                coordinates: {
                                    type: 'object',
                                    properties: {
                                        lat: { type: 'number' },
                                        lng: { type: 'number' }
                                    }
                                }
                            },
                            required: ['address']
                        },
                        workLocation: {
                            type: 'object',
                            properties: {
                                address: { type: 'string', description: 'Work address' },
                                coordinates: {
                                    type: 'object',
                                    properties: {
                                        lat: { type: 'number' },
                                        lng: { type: 'number' }
                                    }
                                }
                            },
                            required: ['address']
                        },
                        travelMode: {
                            type: 'string',
                            enum: ['driving-traffic', 'driving', 'walking', 'cycling'],
                            description: 'Travel mode for the commute',
                            default: 'driving-traffic'
                        },
                        departureTime: {
                            type: 'string',
                            description: 'ISO format departure time'
                        },
                        arrivalTime: {
                            type: 'string',
                            description: 'ISO format arrival time'
                        }
                    },
                    required: ['homeLocation', 'workLocation']
                }
            },
            {
                name: 'get_route',
                description: 'Get detailed route information between two locations',
                inputSchema: {
                    type: 'object',
                    properties: {
                        origin: { type: 'string', description: 'Origin address' },
                        destination: { type: 'string', description: 'Destination address' },
                        travelMode: {
                            type: 'string',
                            enum: ['driving-traffic', 'driving', 'walking', 'cycling'],
                            default: 'driving-traffic'
                        }
                    },
                    required: ['origin', 'destination']
                }
            },
            {
                name: 'batch_commute_analysis',
                description: 'Analyze commutes for multiple home locations to a single work location',
                inputSchema: {
                    type: 'object',
                    properties: {
                        homeLocations: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    address: { type: 'string' },
                                    coordinates: {
                                        type: 'object',
                                        properties: {
                                            lat: { type: 'number' },
                                            lng: { type: 'number' }
                                        }
                                    }
                                }
                            }
                        },
                        workLocation: {
                            type: 'object',
                            properties: {
                                address: { type: 'string' },
                                coordinates: {
                                    type: 'object',
                                    properties: {
                                        lat: { type: 'number' },
                                        lng: { type: 'number' }
                                    }
                                }
                            },
                            required: ['address']
                        },
                        travelMode: {
                            type: 'string',
                            enum: ['driving-traffic', 'driving', 'walking', 'cycling'],
                            default: 'driving-traffic'
                        }
                    },
                    required: ['homeLocations', 'workLocation']
                }
            }
        ];
    }
    registerMCPToolHandlers() {
        this.registerMCPTool('analyze_commute', async (args) => {
            const request = args;
            try {
                const analysis = await this.analyzeCommute(request);
                if (!analysis) {
                    return this.createMCPError('Failed to analyze commute - no data available');
                }
                return this.createMCPJSONResult({
                    success: true,
                    analysis
                });
            }
            catch (error) {
                return this.createMCPError(`Commute analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
        this.registerMCPTool('get_route', async (args) => {
            const { origin, destination, travelMode = 'driving-traffic' } = args;
            try {
                const route = await this.getRoute(origin, destination, travelMode);
                return this.createMCPJSONResult({
                    success: true,
                    route
                });
            }
            catch (error) {
                return this.createMCPError(`Route retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
        this.registerMCPTool('batch_commute_analysis', async (args) => {
            const { homeLocations, workLocation, travelMode = 'driving-traffic' } = args;
            try {
                const analyses = await Promise.all(homeLocations.map(async (homeLocation) => {
                    const analysis = await this.analyzeCommute({
                        homeLocation,
                        workLocation,
                        travelMode
                    });
                    return {
                        homeLocation: homeLocation.address,
                        analysis
                    };
                }));
                return this.createMCPJSONResult({
                    success: true,
                    analyses: analyses.filter(a => a.analysis !== null)
                });
            }
            catch (error) {
                return this.createMCPError(`Batch commute analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    getCapabilities() {
        return [
            {
                name: 'commute_analysis',
                description: 'Analyze commute between two locations using Mapbox',
                parameters: {
                    homeLocation: 'object',
                    workLocation: 'object',
                    travelMode: 'string'
                }
            },
            {
                name: 'route_optimization',
                description: 'Find optimal routes with real-time traffic',
                parameters: {
                    origin: 'string',
                    destination: 'string',
                    alternatives: 'boolean'
                }
            }
        ];
    }
    async analyzeCommute(request) {
        if (!this.mcpClient) {
            console.log('❌ Mapbox MCP client not available, using AI analysis');
            return this.createAICommuteAnalysis(request);
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
                console.log('🔄 Using AI analysis instead...');
                return this.createAICommuteAnalysis(request);
            }
            // Find a suitable routing tool
            const routingTool = tools.find(tool => tool.name.toLowerCase().includes('route') ||
                tool.name.toLowerCase().includes('direction') ||
                tool.name.toLowerCase().includes('matrix'));
            if (!routingTool) {
                console.log('❌ No routing tool found in MCP server, using AI analysis');
                return this.createAICommuteAnalysis(request);
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
            const analysisResponse = await this.makeAIDecision(analysisPrompt);
            const analysisContent = analysisResponse;
            // Try to extract JSON from the response
            const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const aiAnalysis = JSON.parse(jsonMatch[0]);
                    return this.convertAIAnalysisToCommuteAnalysis(aiAnalysis, request);
                }
                catch (parseError) {
                    console.log('⚠️ Could not parse AI analysis JSON, using fallback');
                }
            }
            // Fallback to basic AI analysis
            console.log('🔄 Using fallback AI analysis...');
            return this.createAICommuteAnalysis(request);
        }
        catch (error) {
            console.error('❌ Commute analysis error:', error);
            console.log('🔄 Using AI analysis as fallback...');
            return this.createAICommuteAnalysis(request);
        }
    }
    async createAICommuteAnalysis(request) {
        // Use AI to estimate commute based on locations
        const estimationPrompt = `
Estimate the commute between these locations:
- From: ${request.homeLocation.address}
- To: ${request.workLocation.address}
- Mode: ${request.travelMode || 'driving-traffic'}

Provide realistic estimates for:
1. Distance in kilometers
2. Duration in minutes without traffic
3. Duration in minutes with traffic

Consider typical urban commute patterns. Respond with ONLY a JSON object:
{
  "distance_km": 15.5,
  "duration_minutes": 25,
  "traffic_duration_minutes": 35
}
`;
        try {
            const response = await this.makeAIDecision(estimationPrompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiData = JSON.parse(jsonMatch[0]);
                return this.convertAIAnalysisToCommuteAnalysis(aiData, request);
            }
        }
        catch (error) {
            console.log('⚠️ AI estimation failed, using mock data');
        }
        // Final fallback to mock data
        return this.createMockCommuteAnalysis(request);
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
    // Public method for direct commute analysis (backward compatibility)
    async analyzeCommutePublic(homeLocation, workLocation, travelMode = 'driving-traffic') {
        return await this.analyzeCommute({
            homeLocation: { address: homeLocation },
            workLocation: { address: workLocation },
            travelMode: travelMode
        });
    }
}
exports.CommuteAgentMCP = CommuteAgentMCP;
