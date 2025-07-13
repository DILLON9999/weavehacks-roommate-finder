import { config } from 'dotenv';
import * as readline from 'readline';
import { BaseAgent, AgentCoordinator } from './agents/base-agent';
import { TomTomCommuteAgent } from './agents/commute-agent-tomtom';
import { HousingAgent, DeterministicFilters } from './housing-agent';
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
}

// Enhanced Housing Agent that works with the multi-agent system
class EnhancedHousingAgent extends BaseAgent {
  private originalAgent: HousingAgent;

  constructor() {
    super('HousingAgent');
    this.originalAgent = new HousingAgent();
    this.setupHousingHandlers();
  }

  async initialize(): Promise<void> {
    console.log('🏠 Enhanced Housing Agent initializing...');
    console.log('✅ Housing Agent ready');
  }

  getCapabilities() {
    return [
      {
        name: 'search_listings',
        description: 'Search for housing listings based on criteria',
        parameters: {
          query: 'string',
          filters: 'DeterministicFilters'
        }
      },
      {
        name: 'filter_listings',
        description: 'Apply deterministic filters to listings',
        parameters: {
          filters: 'DeterministicFilters'
        }
      },
      {
        name: 'get_listings_summary',
        description: 'Get summary statistics of available listings',
        parameters: {}
      }
    ];
  }

  private setupHousingHandlers(): void {
    this.registerHandler('search_listings', this.handleSearchListings.bind(this));
    this.registerHandler('filter_listings', this.handleFilterListings.bind(this));
    this.registerHandler('get_listings_summary', this.handleGetSummary.bind(this));
  }

  private async handleSearchListings(message: any) {
    try {
      const { query } = message.payload;
      const results = await this.originalAgent.search(query);
      
      return {
        success: true,
        data: results,
        confidence: 0.9
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  private async handleFilterListings(message: any) {
    try {
      const { filters } = message.payload;
      const results = this.originalAgent.filterListings(filters);
      
      return {
        success: true,
        data: results,
        confidence: 1.0
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Filtering failed'
      };
    }
  }

  private async handleGetSummary(message: any) {
    try {
      const summary = this.originalAgent.getSummary();
      
      return {
        success: true,
        data: { summary },
        confidence: 1.0
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Summary failed'
      };
    }
  }

  // Public methods for direct access
  public async searchListings(query: string): Promise<any[]> {
    return await this.originalAgent.search(query);
  }

  public filterListings(filters: DeterministicFilters) {
    return this.originalAgent.filterListings(filters);
  }
}

// Main Multi-Agent System
class MultiAgentHousingSystem {
  private coordinator: AgentCoordinator;
  private housingAgent: EnhancedHousingAgent;
  private commuteAgent: TomTomCommuteAgent;

  constructor() {
    this.coordinator = new AgentCoordinator();
    this.housingAgent = new EnhancedHousingAgent();
    this.commuteAgent = new TomTomCommuteAgent();
  }

  async initialize(): Promise<void> {
    console.log('🎭 Initializing Multi-Agent Housing System...');
    
    // Initialize all agents
    await this.housingAgent.initialize();
    await this.commuteAgent.initialize();
    
    // Register agents with coordinator
    this.coordinator.registerAgent(this.housingAgent);
    this.coordinator.registerAgent(this.commuteAgent);
    
    console.log('✅ Multi-Agent System ready!');
    console.log(`📊 System Status:`);
    console.log(this.coordinator.getSystemStatus());
  }

  async processQuery(userQuery: UserQuery): Promise<EnhancedListing[]> {
    console.log(`\n🔍 Processing query: "${userQuery.text}"`);
    
    // Step 1: Get housing listings
    console.log('🏠 Searching for housing listings...');
    const housingResults = await this.housingAgent.searchListings(userQuery.text);
    
    if (housingResults.length === 0) {
      console.log('❌ No housing listings found');
      return [];
    }
    
    console.log(`📋 Found ${housingResults.length} housing matches`);
    
    // Step 2: Enhance with commute analysis if work location provided
    let enhancedListings: EnhancedListing[] = housingResults.map(result => ({
      ...result.listing,
      source: (result.listing as any).source,
      overallScore: result.matchPercentage,
      scores: {
        housing: result.matchPercentage
      }
    }));
    
    if (userQuery.workLocation) {
      console.log(`🚗 Analyzing commute to: ${userQuery.workLocation}`);
      enhancedListings = await this.addCommuteAnalysis(enhancedListings, userQuery.workLocation, userQuery.commute);
    }
    
    // Step 3: Calculate overall scores
    enhancedListings = this.calculateOverallScores(enhancedListings);
    
    // Step 4: Sort by overall score
    enhancedListings.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
    
    return enhancedListings.slice(0, 5); // Return top 5
  }

  private async addCommuteAnalysis(
    listings: EnhancedListing[], 
    workLocation: string, 
    commutePrefs?: UserQuery['commute']
  ): Promise<EnhancedListing[]> {
    const enhancedListings: EnhancedListing[] = [];
    
    // Set commute preferences if provided
    if (commutePrefs) {
      await this.commuteAgent.sendMessage(
        this.commuteAgent.agentId,
        'set_preferences',
        {
          maxDistance: commutePrefs.maxDistance,
          maxTime: commutePrefs.maxTime
        }
      );
    }
    
    for (const listing of listings) {
      try {
        const commuteResponse = await this.commuteAgent.sendMessage(
          this.commuteAgent.agentId,
          'commute_analysis',
          {
            homeLocation: { address: listing.location },
            workLocation: { address: workLocation },
            travelMode: commutePrefs?.travelMode || 'driving'
          }
        );
        
        if (commuteResponse.success && commuteResponse.data) {
          const commuteData = commuteResponse.data;
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
          // Keep listing without commute data
          enhancedListings.push(listing);
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
        // Parse the query for work location
        const workLocationMatch = input.match(/(?:commute to|work at|near)\s+([^,]+)/i);
        const workLocation = workLocationMatch ? workLocationMatch[1].trim() : undefined;

        const userQuery: UserQuery = {
          text: input,
          workLocation
        };

        const results = await system.processQuery(userQuery);
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
export { MultiAgentHousingSystem, EnhancedHousingAgent, UserQuery, EnhancedListing };

// Run interactive chat if executed directly
if (require.main === module) {
  startMultiAgentChat();
} 