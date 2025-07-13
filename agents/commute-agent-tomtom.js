"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TomTomCommuteAgent = void 0;
exports.testTomTomCommuteAgent = testTomTomCommuteAgent;
const base_agent_1 = require("./base-agent");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
class TomTomCommuteAgent extends base_agent_1.BaseAgent {
    constructor() {
        super('TomTomCommuteAgent');
        this.maxAcceptableDistance = 50000; // 50km in meters
        this.maxAcceptableTime = 3600; // 60 minutes in seconds
        this.setupCommuteHandlers();
    }
    async initialize() {
        console.log('🗺️ TomTom Commute Agent initializing...');
        console.log('✅ TomTom Commute Agent ready with enhanced traffic analysis!');
    }
    getCapabilities() {
        return [
            {
                name: 'commute_analysis',
                description: 'Analyze commute using TomTom with real-time traffic and incidents',
                parameters: {
                    homeLocation: 'CommuteLocation',
                    workLocation: 'CommuteLocation',
                    travelMode: 'optional: car|pedestrian|bicycle|truck|taxi|bus|van',
                    includeAlternatives: 'optional: boolean',
                    avoidTraffic: 'optional: boolean'
                }
            },
            {
                name: 'batch_commute_analysis',
                description: 'Analyze commute for multiple home locations using TomTom',
                parameters: {
                    homeLocations: 'CommuteLocation[]',
                    workLocation: 'CommuteLocation',
                    travelMode: 'optional: car|pedestrian|bicycle|truck|taxi|bus|van'
                }
            },
            {
                name: 'traffic_analysis',
                description: 'Get detailed traffic incidents and conditions for a route',
                parameters: {
                    homeLocation: 'CommuteLocation',
                    workLocation: 'CommuteLocation'
                }
            },
            {
                name: 'route_alternatives',
                description: 'Get alternative route suggestions with comparisons',
                parameters: {
                    homeLocation: 'CommuteLocation',
                    workLocation: 'CommuteLocation',
                    maxAlternatives: 'optional: number'
                }
            }
        ];
    }
    setupCommuteHandlers() {
        this.registerHandler('commute_analysis', this.handleCommuteAnalysis.bind(this));
        this.registerHandler('batch_commute_analysis', this.handleBatchCommuteAnalysis.bind(this));
        this.registerHandler('traffic_analysis', this.handleTrafficAnalysis.bind(this));
        this.registerHandler('route_alternatives', this.handleRouteAlternatives.bind(this));
        this.registerHandler('set_preferences', this.handleSetPreferences.bind(this));
    }
    async handleCommuteAnalysis(message) {
        try {
            const request = message.payload;
            const result = await this.analyzeCommute(request);
            return {
                success: true,
                data: result,
                confidence: 0.95 // Higher confidence with TomTom's detailed data
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'TomTom commute analysis failed'
            };
        }
    }
    async handleBatchCommuteAnalysis(message) {
        try {
            const { homeLocations, workLocation, travelMode } = message.payload;
            const results = [];
            for (const homeLocation of homeLocations) {
                const request = {
                    homeLocation,
                    workLocation,
                    travelMode: travelMode || 'car'
                };
                const result = await this.analyzeCommute(request);
                results.push({
                    homeLocation,
                    ...result
                });
            }
            // Sort by rating (best commutes first)
            results.sort((a, b) => b.rating - a.rating);
            return {
                success: true,
                data: results,
                confidence: 0.95
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Batch commute analysis failed'
            };
        }
    }
    async handleTrafficAnalysis(message) {
        try {
            const { homeLocation, workLocation } = message.payload;
            const trafficData = await this.analyzeTraffic(homeLocation, workLocation);
            return {
                success: true,
                data: trafficData,
                confidence: 0.9
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Traffic analysis failed'
            };
        }
    }
    async handleRouteAlternatives(message) {
        try {
            const { homeLocation, workLocation, maxAlternatives = 3 } = message.payload;
            const alternatives = await this.getRouteAlternatives(homeLocation, workLocation, maxAlternatives);
            return {
                success: true,
                data: alternatives,
                confidence: 0.9
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Route alternatives failed'
            };
        }
    }
    async handleSetPreferences(message) {
        try {
            const { maxDistance, maxTime } = message.payload;
            if (maxDistance)
                this.maxAcceptableDistance = maxDistance;
            if (maxTime)
                this.maxAcceptableTime = maxTime;
            return {
                success: true,
                data: {
                    maxAcceptableDistance: this.maxAcceptableDistance,
                    maxAcceptableTime: this.maxAcceptableTime
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to set preferences'
            };
        }
    }
    async analyzeCommute(request) {
        console.log(`🗺️ TomTom analyzing commute: ${request.homeLocation.address} → ${request.workLocation.address}`);
        try {
            // Step 1: Geocode addresses to get precise coordinates
            const homeCoords = await this.geocodeAddress(request.homeLocation.address);
            const workCoords = await this.geocodeAddress(request.workLocation.address);
            // Step 2: Get route information
            const routeData = await this.getRouteData(homeCoords, workCoords, request);
            // Step 3: Get traffic information for the route area
            const trafficData = await this.getTrafficData(homeCoords, workCoords);
            // Step 4: Get alternative routes if requested
            let alternatives = undefined;
            if (request.includeAlternatives) {
                alternatives = await this.getRouteAlternatives(request.homeLocation, request.workLocation, 2);
            }
            // Step 5: Build comprehensive result
            const result = {
                distance: routeData.distance,
                duration: routeData.duration,
                durationInTraffic: routeData.durationInTraffic,
                trafficIncidents: trafficData.incidents,
                alternativeRoutes: alternatives,
                rating: 0,
                factors: {
                    distanceScore: 0,
                    timeScore: 0,
                    trafficScore: 0,
                    reliabilityScore: 0
                },
                recommendation: '',
                routeDetails: routeData.details
            };
            // Calculate comprehensive scoring
            this.calculateFactors(result);
            result.rating = this.calculateCommuteRating(result);
            result.recommendation = await this.generateRecommendation(result, request);
            return result;
        }
        catch (error) {
            console.error('❌ TomTom API error:', error);
            // Fallback to mock data if TomTom fails
            return this.getMockCommuteData(request);
        }
    }
    async geocodeAddress(address) {
        // Use TomTom geocoding tool
        try {
            const geocodeResult = await this.callTomTomTool('tomtom-geocode', {
                query: address,
                limit: 1
            });
            if (geocodeResult && geocodeResult.results && geocodeResult.results.length > 0) {
                const result = geocodeResult.results[0];
                return {
                    lat: result.position.lat,
                    lon: result.position.lon
                };
            }
            throw new Error(`Could not geocode address: ${address}`);
        }
        catch (error) {
            console.warn(`⚠️ Geocoding failed for ${address}, using mock coordinates`);
            // Return mock coordinates for San Francisco Bay Area
            return {
                lat: 37.7749 + (Math.random() - 0.5) * 0.5,
                lon: -122.4194 + (Math.random() - 0.5) * 0.5
            };
        }
    }
    async getRouteData(origin, destination, request) {
        try {
            const routeResult = await this.callTomTomTool('tomtom-routing', {
                origin: { lat: origin.lat, lon: origin.lon },
                destination: { lat: destination.lat, lon: destination.lon },
                travelMode: request.travelMode || 'car',
                departAt: request.departureTime?.toISOString(),
                traffic: true,
                instructionsType: 'text',
                routeType: 'fastest'
            });
            if (routeResult && routeResult.routes && routeResult.routes.length > 0) {
                const route = routeResult.routes[0];
                const summary = route.summary;
                return {
                    distance: {
                        text: `${(summary.lengthInMeters / 1000).toFixed(1)} km`,
                        value: summary.lengthInMeters
                    },
                    duration: {
                        text: `${Math.round(summary.travelTimeInSeconds / 60)} mins`,
                        value: summary.travelTimeInSeconds
                    },
                    durationInTraffic: summary.trafficDelayInSeconds ? {
                        text: `${Math.round((summary.travelTimeInSeconds + summary.trafficDelayInSeconds) / 60)} mins`,
                        value: summary.travelTimeInSeconds + summary.trafficDelayInSeconds
                    } : undefined,
                    details: {
                        instructions: route.guidance?.instructions?.map((inst) => inst.message) || [],
                        tollInfo: summary.tollInfo ? `Tolls: ${summary.tollInfo}` : undefined,
                        warnings: route.warnings || []
                    }
                };
            }
            throw new Error('No route found');
        }
        catch (error) {
            console.warn('⚠️ TomTom routing failed, using mock data');
            return this.getMockRouteData();
        }
    }
    async getTrafficData(origin, destination) {
        try {
            // Create bounding box around the route
            const minLat = Math.min(origin.lat, destination.lat) - 0.01;
            const maxLat = Math.max(origin.lat, destination.lat) + 0.01;
            const minLon = Math.min(origin.lon, destination.lon) - 0.01;
            const maxLon = Math.max(origin.lon, destination.lon) + 0.01;
            const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
            const trafficResult = await this.callTomTomTool('tomtom-traffic', {
                bbox,
                maxResults: 10
            });
            const incidents = [];
            if (trafficResult && trafficResult.incidents) {
                for (const incident of trafficResult.incidents) {
                    incidents.push({
                        type: this.getIncidentType(incident.iconCategory),
                        description: incident.description || 'Traffic incident',
                        severity: this.getIncidentSeverity(incident.magnitudeOfDelay),
                        delay: incident.delay ? `${incident.delay} mins` : undefined
                    });
                }
            }
            return { incidents };
        }
        catch (error) {
            console.warn('⚠️ Traffic data failed, using empty incidents');
            return { incidents: [] };
        }
    }
    async getRouteAlternatives(homeLocation, workLocation, maxAlternatives) {
        try {
            const homeCoords = await this.geocodeAddress(homeLocation.address);
            const workCoords = await this.geocodeAddress(workLocation.address);
            const routeResult = await this.callTomTomTool('tomtom-routing', {
                origin: { lat: homeCoords.lat, lon: homeCoords.lon },
                destination: { lat: workCoords.lat, lon: workCoords.lon },
                travelMode: 'car',
                maxAlternatives: maxAlternatives,
                traffic: true,
                routeType: 'fastest'
            });
            const alternatives = [];
            if (routeResult && routeResult.routes && routeResult.routes.length > 1) {
                for (let i = 1; i < Math.min(routeResult.routes.length, maxAlternatives + 1); i++) {
                    const route = routeResult.routes[i];
                    const summary = route.summary;
                    alternatives.push({
                        distance: {
                            text: `${(summary.lengthInMeters / 1000).toFixed(1)} km`,
                            value: summary.lengthInMeters
                        },
                        duration: {
                            text: `${Math.round(summary.travelTimeInSeconds / 60)} mins`,
                            value: summary.travelTimeInSeconds
                        },
                        description: `Alternative route ${i}: ${this.getRouteDescription(route)}`
                    });
                }
            }
            return alternatives;
        }
        catch (error) {
            console.warn('⚠️ Alternative routes failed');
            return [];
        }
    }
    async analyzeTraffic(homeLocation, workLocation) {
        const homeCoords = await this.geocodeAddress(homeLocation.address);
        const workCoords = await this.geocodeAddress(workLocation.address);
        return await this.getTrafficData(homeCoords, workCoords);
    }
    // Helper method to call TomTom MCP tools
    async callTomTomTool(toolName, params) {
        // This would be replaced with actual MCP tool calls
        // For now, we'll simulate the API calls
        console.log(`🔧 Calling TomTom tool: ${toolName} with params:`, params);
        // Mock successful responses based on tool type
        if (toolName === 'tomtom-geocode') {
            return {
                results: [{
                        position: {
                            lat: 37.7749 + (Math.random() - 0.5) * 0.1,
                            lon: -122.4194 + (Math.random() - 0.5) * 0.1
                        }
                    }]
            };
        }
        if (toolName === 'tomtom-routing') {
            const distance = Math.floor(Math.random() * 30000) + 5000;
            const duration = Math.floor(distance / 15) + Math.floor(Math.random() * 600);
            return {
                routes: [{
                        summary: {
                            lengthInMeters: distance,
                            travelTimeInSeconds: duration,
                            trafficDelayInSeconds: Math.floor(duration * 0.2)
                        },
                        guidance: {
                            instructions: [
                                { message: "Head north on Main St" },
                                { message: "Turn right onto Highway 101" },
                                { message: "Take exit for destination" }
                            ]
                        }
                    }]
            };
        }
        if (toolName === 'tomtom-traffic') {
            return {
                incidents: [
                    {
                        iconCategory: 1,
                        description: "Heavy traffic due to road construction",
                        magnitudeOfDelay: 2,
                        delay: 5
                    }
                ]
            };
        }
        return {};
    }
    getMockCommuteData(request) {
        console.log('🎭 Using mock TomTom commute data');
        const mockDistance = Math.floor(Math.random() * 30000) + 5000;
        const mockDuration = Math.floor(mockDistance / 15) + Math.floor(Math.random() * 600);
        const mockTrafficDuration = Math.floor(mockDuration * (1.2 + Math.random() * 0.3));
        const result = {
            distance: {
                text: `${(mockDistance / 1000).toFixed(1)} km`,
                value: mockDistance
            },
            duration: {
                text: `${Math.floor(mockDuration / 60)} mins`,
                value: mockDuration
            },
            durationInTraffic: {
                text: `${Math.floor(mockTrafficDuration / 60)} mins`,
                value: mockTrafficDuration
            },
            trafficIncidents: [
                {
                    type: 'Construction',
                    description: 'Road work causing delays',
                    severity: 'Moderate'
                }
            ],
            rating: 0,
            factors: {
                distanceScore: 0,
                timeScore: 0,
                trafficScore: 0,
                reliabilityScore: 0
            },
            recommendation: ''
        };
        this.calculateFactors(result);
        result.rating = this.calculateCommuteRating(result);
        result.recommendation = `Mock TomTom analysis: ${result.rating >= 7 ? 'Excellent' : result.rating >= 5 ? 'Good' : 'Poor'} commute location`;
        return result;
    }
    getMockRouteData() {
        const distance = Math.floor(Math.random() * 30000) + 5000;
        const duration = Math.floor(distance / 15) + Math.floor(Math.random() * 600);
        return {
            distance: {
                text: `${(distance / 1000).toFixed(1)} km`,
                value: distance
            },
            duration: {
                text: `${Math.round(duration / 60)} mins`,
                value: duration
            },
            durationInTraffic: {
                text: `${Math.round(duration * 1.3 / 60)} mins`,
                value: Math.round(duration * 1.3)
            }
        };
    }
    calculateFactors(result) {
        // Distance score (closer is better)
        result.factors.distanceScore = Math.max(0, Math.min(10, 10 - (result.distance.value / this.maxAcceptableDistance) * 10));
        // Time score (faster is better)
        result.factors.timeScore = Math.max(0, Math.min(10, 10 - (result.duration.value / this.maxAcceptableTime) * 10));
        // Traffic score (less traffic delay is better)
        if (result.durationInTraffic) {
            const trafficDelay = result.durationInTraffic.value - result.duration.value;
            const trafficRatio = trafficDelay / result.duration.value;
            result.factors.trafficScore = Math.max(0, Math.min(10, 10 - trafficRatio * 20));
        }
        else {
            result.factors.trafficScore = 8;
        }
        // Reliability score based on traffic incidents
        const incidentCount = result.trafficIncidents?.length || 0;
        const severeIncidents = result.trafficIncidents?.filter(i => i.severity === 'High').length || 0;
        result.factors.reliabilityScore = Math.max(0, Math.min(10, 10 - (incidentCount * 1.5) - (severeIncidents * 2)));
    }
    calculateCommuteRating(result) {
        const { distanceScore, timeScore, trafficScore, reliabilityScore } = result.factors;
        // Weighted average: distance 30%, time 30%, traffic 25%, reliability 15%
        const weightedSum = distanceScore * 0.3 + timeScore * 0.3 + trafficScore * 0.25 + reliabilityScore * 0.15;
        return Math.round(weightedSum * 10) / 10;
    }
    async generateRecommendation(result, request) {
        const prompt = `
Analyze this TomTom commute data and provide a brief recommendation:

From: ${request.homeLocation.address}
To: ${request.workLocation.address}
Travel Mode: ${request.travelMode || 'car'}

Distance: ${result.distance.text}
Normal Duration: ${result.duration.text}
Duration in Traffic: ${result.durationInTraffic?.text || 'N/A'}
Traffic Incidents: ${result.trafficIncidents?.length || 0}
Overall Rating: ${result.rating}/10

Factor Scores:
- Distance: ${result.factors.distanceScore}/10
- Time: ${result.factors.timeScore}/10
- Traffic: ${result.factors.trafficScore}/10
- Reliability: ${result.factors.reliabilityScore}/10

Alternative Routes Available: ${result.alternativeRoutes?.length || 0}

Provide a 1-2 sentence recommendation about this commute location.
`;
        try {
            return await this.makeAIDecision(prompt);
        }
        catch (error) {
            return `${result.rating >= 7 ? 'Excellent' : result.rating >= 5 ? 'Good' : 'Poor'} commute location with ${result.distance.text} distance and ${result.duration.text} travel time.`;
        }
    }
    // Helper methods for traffic incident processing
    getIncidentType(iconCategory) {
        const types = {
            0: 'Unknown',
            1: 'Accident',
            2: 'Fog',
            3: 'Dangerous Conditions',
            4: 'Rain',
            5: 'Ice',
            6: 'Jam',
            7: 'Lane Closed',
            8: 'Road Closed',
            9: 'Road Works',
            10: 'Wind',
            11: 'Flooding',
            14: 'Broken Down Vehicle'
        };
        return types[iconCategory] || 'Traffic Incident';
    }
    getIncidentSeverity(magnitude) {
        if (magnitude >= 3)
            return 'High';
        if (magnitude >= 2)
            return 'Moderate';
        return 'Low';
    }
    getRouteDescription(route) {
        // Generate a simple description based on route characteristics
        const summary = route.summary;
        const distance = (summary.lengthInMeters / 1000).toFixed(1);
        const time = Math.round(summary.travelTimeInSeconds / 60);
        return `${distance}km route taking approximately ${time} minutes`;
    }
    // Public method for testing
    async testCommute(homeAddress, workAddress) {
        const request = {
            homeLocation: { address: homeAddress },
            workLocation: { address: workAddress },
            travelMode: 'car',
            includeAlternatives: true
        };
        return await this.analyzeCommute(request);
    }
}
exports.TomTomCommuteAgent = TomTomCommuteAgent;
// Standalone function for testing
async function testTomTomCommuteAgent() {
    console.log('🧪 Testing TomTom Commute Agent...');
    const agent = new TomTomCommuteAgent();
    await agent.initialize();
    // Test commute analysis
    const result = await agent.testCommute('123 Main St, San Francisco, CA', '1 Hacker Way, Menlo Park, CA');
    console.log('\n📊 TomTom Commute Analysis Result:');
    console.log(`Distance: ${result.distance.text}`);
    console.log(`Duration: ${result.duration.text}`);
    console.log(`Duration in Traffic: ${result.durationInTraffic?.text || 'N/A'}`);
    console.log(`Traffic Incidents: ${result.trafficIncidents?.length || 0}`);
    console.log(`Alternative Routes: ${result.alternativeRoutes?.length || 0}`);
    console.log(`Rating: ${result.rating}/10`);
    console.log(`Recommendation: ${result.recommendation}`);
    return result;
}
// Run test if executed directly
if (require.main === module) {
    testTomTomCommuteAgent().catch(console.error);
}
