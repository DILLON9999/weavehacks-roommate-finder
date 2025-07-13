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
exports.HousingAgent = exports.MultiAgentHousingSystem = void 0;
const dotenv_1 = require("dotenv");
const readline = __importStar(require("readline"));
const base_agent_1 = require("./agents/base-agent");
const commute_agent_mapbox_1 = require("./agents/commute-agent-mapbox");
const housing_agent_1 = require("./agents/housing-agent");
Object.defineProperty(exports, "HousingAgent", { enumerable: true, get: function () { return housing_agent_1.HousingAgent; } });
const orchestrator_agent_1 = require("./agents/orchestrator-agent");
(0, dotenv_1.config)();
// Main Multi-Agent System
class MultiAgentHousingSystem {
    constructor() {
        this.coordinator = new base_agent_1.AgentCoordinator();
        this.orchestrator = new orchestrator_agent_1.OrchestratorAgent();
        this.housingAgent = new housing_agent_1.HousingAgent();
        this.commuteAgent = new commute_agent_mapbox_1.MapboxCommuteAgent();
    }
    async initialize() {
        console.log('🎭 Initializing Multi-Agent Housing System...');
        // Mapbox commute agent handles its own MCP connection
        // Initialize all agents
        await this.orchestrator.initialize();
        await this.housingAgent.initialize();
        await this.commuteAgent.initialize();
        // Register agents with coordinator
        this.coordinator.registerAgent(this.orchestrator);
        this.coordinator.registerAgent(this.housingAgent);
        this.coordinator.registerAgent(this.commuteAgent);
        console.log('✅ Multi-Agent System ready!');
        console.log(`📊 System Status:`);
        console.log(this.coordinator.getSystemStatus());
    }
    async processQuery(query) {
        console.log(`\n🔍 Processing query: "${query}"`);
        // Step 1: Use orchestrator to analyze query and create plan
        console.log('🎭 Orchestrator analyzing query...');
        const analysis = await this.orchestrator.analyzeQuery(query);
        if (analysis.confidence < 0.5) {
            console.log(`⚠️ Low confidence in query understanding (${analysis.confidence}). Results may be inaccurate.`);
        }
        // Step 2: Execute based on intent
        switch (analysis.intent) {
            case 'housing_search':
                return await this.executeHousingSearch(analysis);
            case 'combined_search':
                return await this.executeCombinedSearch(analysis);
            case 'market_summary':
                await this.executeMarketSummary();
                return [];
            case 'commute_analysis':
                console.log('🚗 Pure commute analysis not yet implemented for listings');
                return [];
            default:
                console.log('❌ Unknown intent, defaulting to housing search');
                return await this.executeHousingSearch(analysis);
        }
    }
    async executeHousingSearch(analysis) {
        console.log('🏠 Executing housing search...');
        const housingResults = await this.housingAgent.search(analysis.housingCriteria?.query || '');
        if (housingResults.length === 0) {
            console.log('❌ No housing listings found');
            return [];
        }
        console.log(`📋 Found ${housingResults.length} housing matches`);
        const enhancedListings = housingResults.map(result => ({
            ...result.listing,
            source: result.listing.source,
            overallScore: result.matchPercentage,
            scores: {
                housing: result.matchPercentage
            },
            housingExplanation: result.descriptionSummary
        }));
        enhancedListings.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
        return enhancedListings.slice(0, 5);
    }
    async executeCombinedSearch(analysis) {
        console.log('🏠🚗 Executing combined housing + commute search...');
        // Step 1: Get housing listings
        const housingResults = await this.housingAgent.search(analysis.housingCriteria?.query || '');
        if (housingResults.length === 0) {
            console.log('❌ No housing listings found');
            return [];
        }
        console.log(`📋 Found ${housingResults.length} housing matches`);
        // Step 2: Add commute analysis
        let enhancedListings = housingResults.map(result => ({
            ...result.listing,
            source: result.listing.source,
            overallScore: result.matchPercentage,
            scores: {
                housing: result.matchPercentage
            },
            housingExplanation: result.descriptionSummary
        }));
        if (analysis.commuteCriteria?.workLocation) {
            console.log(`🚗 Analyzing commute to: ${analysis.commuteCriteria.workLocation}`);
            enhancedListings = await this.addCommuteAnalysis(enhancedListings, analysis.commuteCriteria.workLocation, {
                travelMode: analysis.commuteCriteria.travelMode,
                maxDistance: analysis.commuteCriteria.maxDistance,
                maxTime: analysis.commuteCriteria.maxTime
            });
        }
        // Step 3: Calculate overall scores
        enhancedListings = this.calculateOverallScores(enhancedListings);
        // Step 4: Sort by overall score
        enhancedListings.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
        return enhancedListings.slice(0, 5);
    }
    async executeMarketSummary() {
        console.log('📊 Generating market summary...');
        const summary = this.housingAgent.getSummary();
        console.log(summary);
    }
    async addCommuteAnalysis(listings, workLocation, commutePrefs) {
        const enhancedListings = [];
        // Set commute preferences if provided
        if (commutePrefs) {
            // Set preferences directly on the commute agent
            if (commutePrefs.maxDistance) {
                this.commuteAgent.maxAcceptableDistance = commutePrefs.maxDistance;
            }
            if (commutePrefs.maxTime) {
                this.commuteAgent.maxAcceptableTime = commutePrefs.maxTime;
            }
        }
        for (const listing of listings) {
            try {
                // Map travel modes to Mapbox expected values
                const travelModeMap = {
                    'driving': 'driving-traffic',
                    'walking': 'walking',
                    'bicycling': 'cycling',
                    'transit': 'driving' // Fallback to driving for transit
                };
                const mapboxTravelMode = travelModeMap[commutePrefs?.travelMode || 'driving'] || 'driving-traffic';
                // Call commute agent directly instead of using messaging system
                // Pass listing coordinates if available
                const homeLocation = { address: listing.location };
                if (listing.coordinates) {
                    homeLocation.coordinates = {
                        lat: listing.coordinates.latitude,
                        lng: listing.coordinates.longitude
                    };
                }
                const commuteData = await this.commuteAgent.analyzeCommute({
                    homeLocation,
                    workLocation: { address: workLocation },
                    travelMode: mapboxTravelMode
                });
                if (commuteData) {
                    console.log(`✅ Commute analysis successful for ${listing.location}: ${commuteData.rating}/10`);
                    enhancedListings.push({
                        ...listing,
                        commuteAnalysis: {
                            rating: commuteData.rating,
                            distance: commuteData.distance.text,
                            duration: commuteData.duration.text,
                            durationInTraffic: commuteData.durationInTraffic?.text,
                            recommendation: commuteData.recommendation
                        },
                        scores: {
                            ...listing.scores,
                            commute: commuteData.rating * 10 // Convert to percentage
                        }
                    });
                }
                else {
                    // No commute analysis available - add listing without commute score
                    console.log(`❌ Commute analysis unavailable for ${listing.location} - continuing without commute score`);
                    enhancedListings.push({
                        ...listing,
                        scores: {
                            ...listing.scores
                            // No commute score - will be excluded from overall calculation
                        }
                    });
                }
            }
            catch (error) {
                console.log(`⚠️ Commute analysis failed for ${listing.location}:`, error);
                enhancedListings.push(listing);
            }
        }
        return enhancedListings;
    }
    calculateOverallScores(listings) {
        return listings.map(listing => {
            const scores = listing.scores || {};
            // Weight the scores (housing: 60%, commute: 40%)
            let totalWeight = 0;
            let weightedSum = 0;
            if (scores.housing) {
                weightedSum += scores.housing * 0.6;
                totalWeight += 0.6;
            }
            if (scores.commute) {
                weightedSum += scores.commute * 0.4;
                totalWeight += 0.4;
            }
            // Future: Add budget and lifestyle scores
            const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : scores.housing || 0;
            return {
                ...listing,
                overallScore
            };
        });
    }
    displayResults(listings) {
        if (listings.length === 0) {
            console.log('❌ No results found');
            return;
        }
        console.log(`\n🎯 Found ${listings.length} enhanced results:\n`);
        listings.forEach((listing, index) => {
            const source = listing.source;
            const sourceIcon = source === 'craigslist' ? '🔵' : source === 'facebook' ? '🔴' : '⚪';
            const sourceName = source === 'craigslist' ? 'Craigslist' : source === 'facebook' ? 'Facebook' : 'Unknown';
            console.log(`${index + 1}. ${listing.title} ${sourceIcon} ${sourceName}`);
            console.log(`   🎯 Overall Score: ${listing.overallScore}%`);
            // Show individual scores
            if (listing.scores) {
                const scoreDetails = [];
                if (listing.scores.housing)
                    scoreDetails.push(`Housing: ${listing.scores.housing}%`);
                if (listing.scores.commute)
                    scoreDetails.push(`Commute: ${listing.scores.commute}%`);
                console.log(`   📊 Scores: ${scoreDetails.join(' | ')}`);
            }
            console.log(`   💰 $${listing.price} | 🏠 ${listing.housingType} | 📍 ${listing.location}`);
            console.log(`   🛏️  ${listing.bedrooms}BR/${listing.bathrooms}BA | Private Room: ${listing.privateRoom ? '✅' : '❌'} | Private Bath: ${listing.privateBath ? '✅' : '❌'}`);
            // Show housing explanation
            if (listing.housingExplanation) {
                console.log(`   📝 Housing Score: ${listing.housingExplanation}`);
            }
            // Show commute analysis if available
            if (listing.commuteAnalysis) {
                console.log(`   🚗 Commute: ${listing.commuteAnalysis.distance} (${listing.commuteAnalysis.duration}${listing.commuteAnalysis.durationInTraffic ? ` / ${listing.commuteAnalysis.durationInTraffic} in traffic` : ''})`);
                console.log(`   🎯 Commute Rating: ${listing.commuteAnalysis.rating}/10 - ${listing.commuteAnalysis.recommendation}`);
            }
            console.log(`   🔗 View original: ${listing.url}`);
            console.log('');
        });
    }
    getSystemStatus() {
        return this.coordinator.getSystemStatus();
    }
}
exports.MultiAgentHousingSystem = MultiAgentHousingSystem;
// Interactive chat with multi-agent system
async function startMultiAgentChat() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    console.log('🎭 Multi-Agent Housing Search System');
    console.log('Powered by Housing Agent + Commute Agent!');
    console.log('');
    console.log('Enhanced features:');
    console.log('• Comprehensive housing search');
    console.log('• Commute analysis with Google Maps');
    console.log('• Combined scoring system');
    console.log('');
    console.log('Examples:');
    console.log('- "Find apartments under $2000 near downtown"');
    console.log('- "Show me houses with easy commute to 1 Hacker Way, Menlo Park"');
    console.log('- "Female roommates, private bath, close to BART"');
    console.log('');
    console.log('Type "quit" to exit, "status" for system info.\n');
    const system = new MultiAgentHousingSystem();
    await system.initialize();
    const askQuestion = () => {
        rl.question('\nYou: ', async (input) => {
            if (input.toLowerCase() === 'quit') {
                rl.close();
                return;
            }
            if (input.toLowerCase() === 'status') {
                console.log('\n📊 System Status:');
                console.log(JSON.stringify(system.getSystemStatus(), null, 2));
                askQuestion();
                return;
            }
            try {
                const results = await system.processQuery(input);
                system.displayResults(results);
            }
            catch (error) {
                console.log('❌ Error:', error);
            }
            askQuestion();
        });
    };
    askQuestion();
}
// Run interactive chat if executed directly
if (require.main === module) {
    startMultiAgentChat();
}
