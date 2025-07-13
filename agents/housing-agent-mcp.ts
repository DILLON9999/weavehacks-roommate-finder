import { MCPBaseAgent, MCPTool, MCPToolResult, AgentCapability } from './mcp-base-agent';
import { readFileSync } from 'fs';
import { join } from 'path';

// Import types from the original housing agent
export interface DeterministicFilters {
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  privateRoom?: boolean;
  privateBath?: boolean;
  location?: string;
  housingType?: 'room' | 'apartment' | 'house' | 'studio';
  genderPreference?: 'male' | 'female' | 'any';
}

export interface CleanListing {
  title: string;
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  privateRoom: boolean;
  privateBath: boolean;
  housingType: 'room' | 'apartment' | 'house' | 'studio';
  genderPreference: 'male' | 'female' | 'any';
  description: string;
  url: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface MatchedListing {
  listing: CleanListing;
  matchPercentage: number;
  descriptionSummary: string;
}

export class HousingAgentMCP extends MCPBaseAgent {
  private craigslistData: CleanListing[] = [];
  private facebookData: CleanListing[] = [];

  constructor() {
    super('HousingAgentMCP', 'gpt-4o-mini');
  }

  async initialize(): Promise<void> {
    console.log('🏠 Initializing Housing Agent MCP...');
    await this.loadHousingData();
  }

  getMCPTools(): MCPTool[] {
    return [
      {
        name: 'search_housing',
        description: 'Search for housing listings based on criteria and natural language query',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language search query for housing preferences'
            },
            filters: {
              type: 'object',
              properties: {
                minPrice: { type: 'number', description: 'Minimum price' },
                maxPrice: { type: 'number', description: 'Maximum price' },
                minBedrooms: { type: 'number', description: 'Minimum bedrooms' },
                maxBedrooms: { type: 'number', description: 'Maximum bedrooms' },
                privateRoom: { type: 'boolean', description: 'Requires private room' },
                privateBath: { type: 'boolean', description: 'Requires private bathroom' },
                location: { type: 'string', description: 'Preferred location' },
                housingType: { 
                  type: 'string', 
                  enum: ['room', 'apartment', 'house', 'studio'],
                  description: 'Type of housing'
                },
                genderPreference: {
                  type: 'string',
                  enum: ['male', 'female', 'any'],
                  description: 'Gender preference for roommates'
                }
              }
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return',
              default: 5
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_housing_summary',
        description: 'Get a summary of available housing data',
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              enum: ['all', 'craigslist', 'facebook'],
              description: 'Data source to summarize',
              default: 'all'
            }
          }
        }
      },
      {
        name: 'filter_housing',
        description: 'Apply deterministic filters to housing listings',
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'object',
              properties: {
                minPrice: { type: 'number' },
                maxPrice: { type: 'number' },
                minBedrooms: { type: 'number' },
                maxBedrooms: { type: 'number' },
                privateRoom: { type: 'boolean' },
                privateBath: { type: 'boolean' },
                location: { type: 'string' },
                housingType: { type: 'string', enum: ['room', 'apartment', 'house', 'studio'] },
                genderPreference: { type: 'string', enum: ['male', 'female', 'any'] }
              }
            },
            maxResults: { type: 'number', default: 10 }
          },
          required: ['filters']
        }
      }
    ];
  }

  registerMCPToolHandlers(): void {
    this.registerMCPTool('search_housing', async (args) => {
      const { query, filters = {}, maxResults = 5 } = args;
      
      try {
        const results = await this.searchHousing(query, filters, maxResults);
        return this.createMCPJSONResult({
          success: true,
          results: results.map(r => ({
            listing: r.listing,
            matchPercentage: r.matchPercentage,
            explanation: r.descriptionSummary
          })),
          count: results.length
        });
      } catch (error) {
        return this.createMCPError(`Housing search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    this.registerMCPTool('get_housing_summary', async (args) => {
      const { source = 'all' } = args;
      
      try {
        const summary = this.getHousingSummary(source);
        return this.createMCPJSONResult(summary);
      } catch (error) {
        return this.createMCPError(`Failed to get housing summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    this.registerMCPTool('filter_housing', async (args) => {
      const { filters, maxResults = 10 } = args;
      
      try {
        const results = this.filterHousing(filters, maxResults);
        return this.createMCPJSONResult({
          success: true,
          results,
          count: results.length
        });
      } catch (error) {
        return this.createMCPError(`Housing filter failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  getCapabilities(): AgentCapability[] {
    return [
      {
        name: 'housing_search',
        description: 'Search and filter housing listings from multiple sources',
        parameters: {
          query: 'string',
          filters: 'object',
          maxResults: 'number'
        }
      }
    ];
  }

  private async loadHousingData(): Promise<void> {
    try {
      // Load Craigslist data
      const craigslistPath = join(process.cwd(), 'CraigslistData', 'clean-listings.json');
      const craigslistRaw = readFileSync(craigslistPath, 'utf-8');
      this.craigslistData = JSON.parse(craigslistRaw).map((item: any) => ({
        ...item,
        source: 'craigslist'
      }));
      console.log(`📊 Loaded ${this.craigslistData.length} Craigslist listings`);

      // Load Facebook data
      const facebookPath = join(process.cwd(), 'FacebookData', 'clean-listings.json');
      const facebookRaw = readFileSync(facebookPath, 'utf-8');
      this.facebookData = JSON.parse(facebookRaw).map((item: any) => ({
        ...item,
        source: 'facebook'
      }));
      console.log(`📊 Loaded ${this.facebookData.length} Facebook listings`);

    } catch (error) {
      console.error('❌ Error loading housing data:', error);
      throw error;
    }
  }

  private getAllListings(): CleanListing[] {
    return [...this.craigslistData, ...this.facebookData];
  }

  private async searchHousing(query: string, filters: DeterministicFilters = {}, maxResults: number = 5): Promise<MatchedListing[]> {
    console.log(`🔍 Searching housing with query: "${query}"`);
    
    // First apply deterministic filters
    let filteredListings = this.filterHousing(filters);
    
    if (filteredListings.length === 0) {
      return [];
    }

    // Check if there are natural language requirements that need AI processing
    const hasNaturalLanguage = await this.hasNaturalLanguageRequirements(query);
    
    if (!hasNaturalLanguage) {
      console.log('✅ Returning deterministic results');
      const deterministicResults: MatchedListing[] = [];
      
      for (const listing of filteredListings.slice(0, maxResults)) {
        const summary = await this.generateDeterministicSummary(listing, query, filters);
        deterministicResults.push({
          listing,
          matchPercentage: 100, // 100% match for deterministic results
          descriptionSummary: `100% match: ${summary}`
        });
      }
      
      return deterministicResults;
    }

    // Use batch AI processing for natural language requirements
    console.log('🤖 Applying AI matching with batch processing...');
    const aiMatched = await this.matchWithAIBatch(filteredListings, query, maxResults);
    console.log(`🎯 ${aiMatched.length} listings match natural language criteria`);
    
    return aiMatched;
  }

  private async hasNaturalLanguageRequirements(query: string): Promise<boolean> {
    const prompt = `
Does this query contain natural language requirements that can't be handled by deterministic filters?

Query: "${query}"

Deterministic filters can handle: price, bedrooms, bathrooms, housing type, private room/bath, gender preference, location.

Natural language requirements include: roommate lifestyle preferences, personality traits, cleanliness, social preferences, specific amenities descriptions, etc.

Respond with ONLY: yes or no
`;

    try {
      const response = await this.makeAIDecision(prompt);
      return response.toLowerCase().trim().includes('yes');
    } catch (error) {
      return false;
    }
  }

  private async matchWithAIBatch(listings: CleanListing[], naturalLanguageQuery: string, maxResults: number = 5): Promise<MatchedListing[]> {
    if (listings.length === 0) return [];

    console.log(`🚀 Processing ${listings.length} listings in parallel (5 groups)...`);

    // Split listings into groups for parallel processing
    const groupSize = Math.ceil(listings.length / 5);
    const groups: CleanListing[][] = [];
    
    for (let i = 0; i < listings.length; i += groupSize) {
      groups.push(listings.slice(i, i + groupSize));
    }

    console.log(`📊 Created ${groups.length} groups with sizes: ${groups.map(g => g.length).join(', ')}`);

    const processGroup = async (group: CleanListing[], groupIndex: number): Promise<MatchedListing[]> => {
      console.log(`🔄 Processing group ${groupIndex + 1} with ${group.length} listings...`);
      const prompt = `
You are analyzing housing listings for this query: "${naturalLanguageQuery}"

Rate each listing 0-100 based on how well it matches the query requirements. Focus on:
- Roommate preferences (gender, age, lifestyle)
- Living situation compatibility
- Social preferences
- Cleanliness and habits
- Any specific requirements mentioned

Listings to analyze:
${group.map((listing, idx) => `
${idx + 1}. ${listing.title}
   Price: $${listing.price}
   Location: ${listing.location}
   Type: ${listing.housingType}, ${listing.bedrooms}BR/${listing.bathrooms}BA
   Private Room: ${listing.privateRoom ? 'Yes' : 'No'}
   Private Bath: ${listing.privateBath ? 'Yes' : 'No'}
   Gender Preference: ${listing.genderPreference}
   Description: ${listing.description?.substring(0, 300) || 'No description'}
`).join('\n')}

Respond with ONLY a JSON array of objects (no other text):
[
  {
    "index": 1,
    "score": 85,
    "reason": "Explain WHY this score was given - mention specific factors from the listing that match or don't match the query"
  }
]

IMPORTANT: In the "reason" field, explain WHY you gave that specific percentage score. Be specific about what factors from the listing description, title, or details led to that score.

Only include listings with scores ≥ 60.
`;

      try {
        const response = await this.makeAIDecision(prompt);
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          const scores = JSON.parse(jsonMatch[0]);
          const results: MatchedListing[] = [];
          
          for (const score of scores) {
            const listingIndex = score.index - 1;
            if (listingIndex >= 0 && listingIndex < group.length && score.score >= 60) {
              const listing = group[listingIndex];
              results.push({
                listing,
                matchPercentage: score.score,
                descriptionSummary: `${score.score}% match: ${score.reason}`
              });
            }
          }
          
          console.log(`✅ Group ${groupIndex + 1} completed: ${results.length} matches found`);
          return results;
        } else {
          console.log(`⚠️ Group ${groupIndex + 1}: No valid JSON found in AI response`);
        }
      } catch (error) {
        console.log(`❌ Error processing group ${groupIndex + 1}:`, error);
      }
      
      console.log(`❌ Group ${groupIndex + 1}: No results returned`);
      return [];
    };

    // Process all groups in parallel
    const groupPromises = groups.map((group, index) => processGroup(group, index));
    const groupResults = await Promise.all(groupPromises);
    
    // Combine and sort results
    const allResults = groupResults.flat();
    allResults.sort((a, b) => b.matchPercentage - a.matchPercentage);
    
    return allResults.slice(0, maxResults);
  }

  private async generateDeterministicSummary(listing: CleanListing, query: string, filters: DeterministicFilters): Promise<string> {
    const matchingFactors: string[] = [];
    
    // Analyze which filters this listing matches
    if (filters.maxPrice && listing.price <= filters.maxPrice) {
      matchingFactors.push(`under $${filters.maxPrice} budget`);
    }
    if (filters.minPrice && listing.price >= filters.minPrice) {
      matchingFactors.push(`above $${filters.minPrice} minimum`);
    }
    if (filters.housingType && listing.housingType === filters.housingType) {
      matchingFactors.push(`${filters.housingType} type`);
    }
    if (filters.minBedrooms && listing.bedrooms >= filters.minBedrooms) {
      matchingFactors.push(`${listing.bedrooms}+ bedrooms`);
    }
    if (filters.maxBedrooms && listing.bedrooms <= filters.maxBedrooms) {
      matchingFactors.push(`≤${filters.maxBedrooms} bedrooms`);
    }
    if (filters.privateBath === true && listing.privateBath) {
      matchingFactors.push('private bathroom');
    }
    if (filters.privateRoom === true && listing.privateRoom) {
      matchingFactors.push('private room');
    }
    if (filters.genderPreference && filters.genderPreference !== 'any') {
      if (listing.genderPreference === 'any' || listing.genderPreference === filters.genderPreference) {
        matchingFactors.push(`${filters.genderPreference} preference match`);
      }
    }
    
    // If no specific factors, use general match
    if (matchingFactors.length === 0) {
      return `Meets all basic criteria for "${query}"`;
    }
    
    return `Matches ${matchingFactors.join(', ')} requirements`;
  }

  private filterHousing(filters: DeterministicFilters, maxResults?: number): CleanListing[] {
    let listings = this.getAllListings();

    if (filters.minPrice !== undefined) {
      listings = listings.filter(l => l.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      listings = listings.filter(l => l.price <= filters.maxPrice!);
    }
    if (filters.minBedrooms !== undefined) {
      listings = listings.filter(l => l.bedrooms >= filters.minBedrooms!);
    }
    if (filters.maxBedrooms !== undefined) {
      listings = listings.filter(l => l.bedrooms <= filters.maxBedrooms!);
    }
    if (filters.privateRoom !== undefined) {
      listings = listings.filter(l => l.privateRoom === filters.privateRoom);
    }
    if (filters.privateBath !== undefined) {
      listings = listings.filter(l => l.privateBath === filters.privateBath);
    }
    if (filters.location) {
      const locationLower = filters.location.toLowerCase();
      listings = listings.filter(l => 
        l.location.toLowerCase().includes(locationLower)
      );
    }
    if (filters.housingType) {
      listings = listings.filter(l => l.housingType === filters.housingType);
    }
    if (filters.genderPreference && filters.genderPreference !== 'any') {
      listings = listings.filter(l => 
        l.genderPreference === 'any' || l.genderPreference === filters.genderPreference
      );
    }

    return maxResults ? listings.slice(0, maxResults) : listings;
  }

  private getHousingSummary(source: string = 'all') {
    let data: CleanListing[];
    
    switch (source) {
      case 'craigslist':
        data = this.craigslistData;
        break;
      case 'facebook':
        data = this.facebookData;
        break;
      default:
        data = this.getAllListings();
    }

    if (data.length === 0) {
      return { error: 'No data available' };
    }

    const prices = data.map(l => l.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const housingTypes = data.reduce((acc, l) => {
      acc[l.housingType] = (acc[l.housingType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const locations = data.reduce((acc, l) => {
      acc[l.location] = (acc[l.location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      source,
      totalListings: data.length,
      priceStats: {
        average: Math.round(avgPrice),
        min: minPrice,
        max: maxPrice
      },
      housingTypes,
      topLocations: Object.entries(locations)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((acc, [loc, count]) => ({ ...acc, [loc]: count }), {}),
      privateRoomAvailable: data.filter(l => l.privateRoom).length,
      privateBathAvailable: data.filter(l => l.privateBath).length
    };
  }

  // Public methods for backward compatibility
  async search(query: string, filters: DeterministicFilters = {}): Promise<MatchedListing[]> {
    return this.searchHousing(query, filters);
  }

  getSummary(source: string = 'all') {
    return this.getHousingSummary(source);
  }
} 