import { config } from 'dotenv';
import * as readline from 'readline';
import { BaseAgent, AgentCoordinator } from './agents/base-agent';
import { MapboxCommuteAgent } from './agents/commute-agent-mapbox';
import { HousingAgent, DeterministicFilters, MatchedListing } from './agents/housing-agent';
import { OrchestratorAgent, QueryAnalysis } from './agents/orchestrator-agent';
import { CleanListing } from './scraper';

config();

// Enhanced interfaces for multi-agent system
interface UserQuery {
  text: string;
  workLocation?: string;
  budget?: {
    min?: number;
    max?: number;
  };
  lifestyle?: string[];
  commute?: {
    maxDistance?: number;
    maxTime?: number;
    travelMode?: 'driving' | 'walking' | 'bicycling' | 'transit';
  };
}

interface EnhancedListing extends CleanListing {
  source?: string;
  commuteAnalysis?: {
    rating: number;
    distance: string;
    duration: string;
    durationInTraffic?: string;
    recommendation: string;
  };
  overallScore?: number;
  scores?: {
    housing?: number;
    commute?: number;
    budget?: number;
    lifestyle?: number;
  };
  housingExplanation?: string; // Explanation for why this listing got its housing score
}



// Main Multi-Agent System
class MultiAgentHousingSystem {
  private coordinator: AgentCoordinator;
  private orchestrator: OrchestratorAgent;
  private housingAgent: HousingAgent;
  private commuteAgent: MapboxCommuteAgent;

  constructor() {
    this.coordinator = new AgentCoordinator();
    this.orchestrator = new OrchestratorAgent();
    this.housingAgent = new HousingAgent();
    this.commuteAgent = new MapboxCommuteAgent();
  }

  async initialize(): Promise<void> {
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

  async processQuery(query: string): Promise<EnhancedListing[]> {
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

  private async executeHousingSearch(analysis: QueryAnalysis): Promise<EnhancedListing[]> {
    console.log('🏠 Executing housing search...');
    
    const housingResults = await this.housingAgent.search(analysis.housingCriteria?.query || '');
    
    if (housingResults.length === 0) {
      console.log('❌ No housing listings found');
      return [];
    }
    
    console.log(`📋 Found ${housingResults.length} housing matches`);
    
    const enhancedListings: EnhancedListing[] = housingResults.map(result => ({
      ...result.listing,
      source: (result.listing as any).source,
      overallScore: result.matchPercentage,
      scores: {
        housing: result.matchPercentage
      },
      housingExplanation: result.descriptionSummary
    }));
    
    enhancedListings.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
    return enhancedListings.slice(0, 5);
  }

  private async executeCombinedSearch(analysis: QueryAnalysis): Promise<EnhancedListing[]> {
    console.log('🏠🚗 Executing combined housing + commute search...');
    
    // Step 1: Get housing listings
    const housingResults = await this.housingAgent.search(analysis.housingCriteria?.query || '');
    
    if (housingResults.length === 0) {
      console.log('❌ No housing listings found');
      return [];
    }
    
    console.log(`📋 Found ${housingResults.length} housing matches`);
    
    // Step 2: Add commute analysis
    let enhancedListings: EnhancedListing[] = housingResults.map(result => ({
      ...result.listing,
      source: (result.listing as any).source,
      overallScore: result.matchPercentage,
      scores: {
        housing: result.matchPercentage
      },
      housingExplanation: result.descriptionSummary
    }));
    
    if (analysis.commuteCriteria?.workLocation) {
      console.log(`🚗 Analyzing commute to: ${analysis.commuteCriteria.workLocation}`);
      enhancedListings = await this.addCommuteAnalysis(
        enhancedListings, 
        analysis.commuteCriteria.workLocation,
        {
          travelMode: analysis.commuteCriteria.travelMode,
          maxDistance: analysis.commuteCriteria.maxDistance,
          maxTime: analysis.commuteCriteria.maxTime
        }
      );
    }
    
    // Step 3: Calculate overall scores
    enhancedListings = this.calculateOverallScores(enhancedListings);
    
    // Step 4: Sort by overall score
    enhancedListings.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
    
    return enhancedListings.slice(0, 5);
  }

  private async executeMarketSummary(): Promise<void> {
    console.log('📊 Generating market summary...');
    const summary = this.housingAgent.getSummary();
    console.log(summary);
  }

  private async addCommuteAnalysis(
    listings: EnhancedListing[], 
    workLocation: string, 
    commutePrefs?: UserQuery['commute']
  ): Promise<EnhancedListing[]> {
    const enhancedListings: EnhancedListing[] = [];
    
    // Set commute preferences if provided
    if (commutePrefs) {
      // Set preferences directly on the commute agent
      if (commutePrefs.maxDistance) {
        (this.commuteAgent as any).maxAcceptableDistance = commutePrefs.maxDistance;
      }
      if (commutePrefs.maxTime) {
        (this.commuteAgent as any).maxAcceptableTime = commutePrefs.maxTime;
      }
    }
    
    for (const listing of listings) {
      try {
        // Map travel modes to Mapbox expected values
        const travelModeMap: { [key: string]: string } = {
          'driving': 'driving-traffic',
          'walking': 'walking',
          'bicycling': 'cycling',
          'transit': 'driving' // Fallback to driving for transit
        };
        
        const mapboxTravelMode = travelModeMap[commutePrefs?.travelMode || 'driving'] || 'driving-traffic';
        
        // Call commute agent directly instead of using messaging system
        // Pass listing coordinates if available
        const homeLocation: any = { address: listing.location };
        if ((listing as any).coordinates) {
          homeLocation.coordinates = {
            lat: (listing as any).coordinates.latitude,
            lng: (listing as any).coordinates.longitude
          };
        }
        
        const commuteData = await this.commuteAgent.analyzeCommute({
          homeLocation,
          workLocation: { address: workLocation },
          travelMode: mapboxTravelMode as any
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
        } else {
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
      } catch (error) {
        console.log(`⚠️ Commute analysis failed for ${listing.location}:`, error);
        enhancedListings.push(listing);
      }
    }
    
    return enhancedListings;
  }

  private calculateOverallScores(listings: EnhancedListing[]): EnhancedListing[] {
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

  displayResults(listings: EnhancedListing[]): void {
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
        if (listing.scores.housing) scoreDetails.push(`Housing: ${listing.scores.housing}%`);
        if (listing.scores.commute) scoreDetails.push(`Commute: ${listing.scores.commute}%`);
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
      } catch (error) {
        console.log('❌ Error:', error);
      }

      askQuestion();
    });
  };

  askQuestion();
}

// Export for use in other modules
export { MultiAgentHousingSystem, HousingAgent, UserQuery, EnhancedListing };

// Run interactive chat if executed directly
if (require.main === module) {
  startMultiAgentChat();
} 