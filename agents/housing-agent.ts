import { BaseAgent, AgentCapability, AgentMessage, AgentResponse } from './base-agent';
import { readFileSync, existsSync } from 'fs';
import { CleanListing } from '../scraper';
import { config } from 'dotenv';

config();

export interface DeterministicFilters {
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  housingType?: string;
  privateRoom?: boolean;
  privateBath?: boolean;
  smoking?: boolean;
}

export interface MatchedListing {
  listing: CleanListing;
  matchPercentage: number;
  originalUrl: string;
  descriptionSummary: string;
}

export class HousingAgent extends BaseAgent {
  private listings: CleanListing[] = [];

  constructor() {
    super('HousingAgent');
    this.setupHousingHandlers();
  }

  async initialize(): Promise<void> {
    console.log('🏠 Housing Agent initializing...');
    this.loadListings();
    console.log('✅ Housing Agent ready');
  }

  getCapabilities(): AgentCapability[] {
    return [
      {
        name: 'search_listings',
        description: 'Search for housing listings based on natural language criteria',
        parameters: {
          query: 'string - Natural language search query'
        }
      },
      {
        name: 'filter_listings',
        description: 'Apply deterministic filters to listings',
        parameters: {
          filters: 'DeterministicFilters - Structured filters for price, bedrooms, etc.'
        }
      },
      {
        name: 'get_summary',
        description: 'Get summary statistics of available listings',
        parameters: {}
      },
      {
        name: 'extract_filters',
        description: 'Extract deterministic filters from natural language query',
        parameters: {
          query: 'string - Natural language query to parse'
        }
      },
      {
        name: 'get_listings_count',
        description: 'Get total count of loaded listings',
        parameters: {}
      }
    ];
  }

  private setupHousingHandlers(): void {
    this.registerHandler('search_listings', this.handleSearchListings.bind(this));
    this.registerHandler('filter_listings', this.handleFilterListings.bind(this));
    this.registerHandler('get_summary', this.handleGetSummary.bind(this));
    this.registerHandler('extract_filters', this.handleExtractFilters.bind(this));
    this.registerHandler('get_listings_count', this.handleGetListingsCount.bind(this));
  }

  private async handleSearchListings(message: AgentMessage): Promise<AgentResponse> {
    try {
      const { query } = message.payload;
      const results = await this.search(query);
      
      return {
        success: true,
        data: results,
        confidence: 0.9,
        metadata: {
          resultsCount: results.length,
          totalListings: this.listings.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  private async handleFilterListings(message: AgentMessage): Promise<AgentResponse> {
    try {
      const { filters } = message.payload;
      const results = this.filterListings(filters);
      
      return {
        success: true,
        data: results,
        confidence: 1.0,
        metadata: {
          resultsCount: results.length,
          filtersApplied: Object.keys(filters).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Filtering failed'
      };
    }
  }

  private async handleGetSummary(message: AgentMessage): Promise<AgentResponse> {
    try {
      const summary = this.getSummary();
      
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

  private async handleExtractFilters(message: AgentMessage): Promise<AgentResponse> {
    try {
      const { query } = message.payload;
      const filters = await this.extractFilters(query);
      
      return {
        success: true,
        data: filters,
        confidence: 0.8
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Filter extraction failed'
      };
    }
  }

  private async handleGetListingsCount(message: AgentMessage): Promise<AgentResponse> {
    return {
      success: true,
      data: { 
        totalListings: this.listings.length,
        craigslistListings: this.listings.filter(l => (l as any).source === 'craigslist').length,
        facebookListings: this.listings.filter(l => (l as any).source === 'facebook').length
      },
      confidence: 1.0
    };
  }

  // Core business logic methods (adapted from original housing agent)
  private loadListings(): void {
    this.listings = [];
    let totalLoaded = 0;

    // Load Craigslist data
    const craigslistPath = 'CraigslistData/clean-listings.json';
    if (existsSync(craigslistPath)) {
      try {
        const craigslistData = readFileSync(craigslistPath, 'utf8');
        const craigslistListings = JSON.parse(craigslistData);
        
        // Add source field to identify origin
        craigslistListings.forEach((listing: any) => {
          (listing as any).source = 'craigslist';
        });
        
        this.listings.push(...craigslistListings);
        totalLoaded += craigslistListings.length;
        console.log(`📂 Loaded ${craigslistListings.length} listings from Craigslist`);
      } catch (error) {
        console.log('❌ Error loading Craigslist listings:', error);
      }
    } else {
      console.log('⚠️ No Craigslist data found at CraigslistData/clean-listings.json');
    }

    // Load Facebook data
    const facebookPath = 'FacebookData/clean-listings.json';
    if (existsSync(facebookPath)) {
      try {
        const facebookData = readFileSync(facebookPath, 'utf8');
        const facebookListings = JSON.parse(facebookData);
        
        // Add source field to identify origin
        facebookListings.forEach((listing: any) => {
          (listing as any).source = 'facebook';
        });
        
        this.listings.push(...facebookListings);
        totalLoaded += facebookListings.length;
        console.log(`📂 Loaded ${facebookListings.length} listings from Facebook`);
      } catch (error) {
        console.log('❌ Error loading Facebook listings:', error);
      }
    } else {
      console.log('⚠️ No Facebook data found at FacebookData/clean-listings.json');
    }

    if (totalLoaded === 0) {
      console.log('❌ No listings loaded from any source. Run scrapers first.');
      return;
    }

    console.log(`📊 Total listings loaded: ${totalLoaded}`);
    
    // Debug: show sample listings from each source
    if (this.listings.length > 0) {
      console.log('📋 Sample listings:');
      const craigslistSample = this.listings.filter(l => (l as any).source === 'craigslist').slice(0, 2);
      const facebookSample = this.listings.filter(l => (l as any).source === 'facebook').slice(0, 2);
      
      if (craigslistSample.length > 0) {
        console.log('  🔵 Craigslist samples:');
        craigslistSample.forEach(l => console.log(`    - ${l.title} ($${l.price})`));
      }
      
      if (facebookSample.length > 0) {
        console.log('  🔴 Facebook samples:');
        facebookSample.forEach(l => console.log(`    - ${l.title} ($${l.price})`));
      }
    }
  }

  public filterListings(filters: DeterministicFilters): CleanListing[] {
    console.log('🔍 Filtering listings with filters:', filters);
    console.log('📊 Total listings to filter:', this.listings.length);
    
    let passedCount = 0;
    let failedCount = 0;
    
    const results = this.listings.filter(listing => {
      // Price filters
      if (filters.minPrice && listing.price > 0 && listing.price < filters.minPrice) {
        console.log(`❌ Price too low: ${listing.price} < ${filters.minPrice}`);
        failedCount++;
        return false;
      }
      if (filters.maxPrice && listing.price > 0 && listing.price > filters.maxPrice) {
        console.log(`❌ Price too high: ${listing.price} > ${filters.maxPrice}`);
        failedCount++;
        return false;
      }
      
      // Skip listings with zero price (likely invalid data)
      if (listing.price === 0) {
        console.log(`❌ Zero price listing: ${listing.title}`);
        failedCount++;
        return false;
      }
      
      // Bedroom filters - only apply if we have valid bedroom data
      if (filters.minBedrooms && listing.bedrooms > 0 && listing.bedrooms < filters.minBedrooms) {
        console.log(`❌ Too few bedrooms: ${listing.bedrooms} < ${filters.minBedrooms}`);
        failedCount++;
        return false;
      }
      if (filters.maxBedrooms && listing.bedrooms > 0 && listing.bedrooms > filters.maxBedrooms) {
        console.log(`❌ Too many bedrooms: ${listing.bedrooms} > ${filters.maxBedrooms}`);
        failedCount++;
        return false;
      }
      
      // Bathroom filters - only apply if we have valid bathroom data
      if (filters.minBathrooms && listing.bathrooms > 0 && listing.bathrooms < filters.minBathrooms) {
        console.log(`❌ Too few bathrooms: ${listing.bathrooms} < ${filters.minBathrooms}`);
        failedCount++;
        return false;
      }
      if (filters.maxBathrooms && listing.bathrooms > 0 && listing.bathrooms > filters.maxBathrooms) {
        console.log(`❌ Too many bathrooms: ${listing.bathrooms} > ${filters.maxBathrooms}`);
        failedCount++;
        return false;
      }
      
      // Housing type filter - only apply if not "unknown"
      if (filters.housingType && listing.housingType !== 'unknown' && listing.housingType !== filters.housingType) {
        console.log(`❌ Wrong housing type: ${listing.housingType} !== ${filters.housingType}`);
        failedCount++;
        return false;
      }
      
      // Boolean filters
      if (filters.privateRoom !== null && filters.privateRoom !== undefined && listing.privateRoom !== filters.privateRoom) {
        console.log(`❌ Private room mismatch: ${listing.privateRoom} !== ${filters.privateRoom}`);
        failedCount++;
        return false;
      }
      if (filters.privateBath !== null && filters.privateBath !== undefined && listing.privateBath !== filters.privateBath) {
        console.log(`❌ Private bath mismatch: ${listing.privateBath} !== ${filters.privateBath}`);
        failedCount++;
        return false;
      }
      if (filters.smoking !== null && filters.smoking !== undefined && listing.smoking !== filters.smoking) {
        console.log(`❌ Smoking mismatch: ${listing.smoking} !== ${filters.smoking}`);
        failedCount++;
        return false;
      }
      
      // Location filter - removed as it was too strict and causing 0 matches
      // The AI often extracts work locations (like "Stanford University") as location filters
      // which don't match housing locations (like "Palo Alto, CA")
      // Location matching is better handled by the commute agent
      
      // If we get here, the listing passed all filters
      console.log(`✅ Passed: ${listing.title} - $${listing.price}`);
      passedCount++;
      return true;
    });
    
    console.log(`📊 Filter results: ${passedCount} passed, ${failedCount} failed`);
    console.log('✅ Listings after filtering:', results.length);
    return results;
  }

  public async extractFilters(query: string): Promise<DeterministicFilters> {
    const prompt = `
Extract deterministic filters from this housing search query: "${query}"

Respond with ONLY a JSON object (no other text):
{
  "minPrice": number or null,
  "maxPrice": number or null,
  "minBedrooms": number or null,
  "maxBedrooms": number or null,
  "minBathrooms": number or null,
  "maxBathrooms": number or null,
  "housingType": "house" | "apartment" | "condo" | null,
  "privateRoom": boolean or null,
  "privateBath": boolean or null,
  "smoking": boolean or null
}

Examples:
"Find houses under $2000" → {"maxPrice": 2000, "housingType": "house"}
"Show me 2+ bedroom apartments" → {"minBedrooms": 2, "housingType": "apartment"}
"Private bath required, no smoking" → {"privateBath": true, "smoking": false}

Note: Do not extract location filters as location matching is handled by the commute agent.
`;

    try {
      const response = await this.makeAIDecision(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.log('Error extracting filters:', error);
    }
    
    return {};
  }

  public async search(query: string): Promise<MatchedListing[]> {
    console.log(`🔍 Searching: "${query}"`);
    
    // Step 1: Extract deterministic filters
    console.log('📊 Extracting filters...');
    const filters = await this.extractFilters(query);
    console.log('Filters:', filters);
    
    // Step 2: Apply deterministic filters
    const filteredListings = this.filterListings(filters);
    console.log(`📋 ${filteredListings.length} listings match deterministic filters`);
    
    if (filteredListings.length === 0) {
      console.log('❌ No listings match your criteria');
      return [];
    }
    
    // Step 3: Check if there are natural language requirements
    const hasNaturalLanguage = await this.hasNaturalLanguageRequirements(query);
    
    if (!hasNaturalLanguage) {
      console.log('✅ Returning deterministic results');
      const deterministicResults: MatchedListing[] = [];
      
      for (const listing of filteredListings.slice(0, 10)) {
        const summary = await this.generateDeterministicSummary(listing, query, filters);
        deterministicResults.push({
          listing,
          matchPercentage: 100, // 100% match for deterministic results
          originalUrl: listing.url,
          descriptionSummary: `100% match: ${summary}`
        });
      }
      
      return deterministicResults;
    }
    
    // Step 4: Apply AI matching for natural language requirements
    console.log('🤖 Applying AI matching...');
    const aiMatched = await this.matchWithAI(filteredListings, query, 5);
    console.log(`🎯 ${aiMatched.length} listings match natural language criteria`);
    
    return aiMatched;
  }

  private async hasNaturalLanguageRequirements(query: string): Promise<boolean> {
    const prompt = `
Does this query contain natural language requirements that can't be handled by deterministic filters?

Query: "${query}"

Deterministic filters can handle: price, bedrooms, bathrooms, housing type, private room/bath, smoking, location.

Natural language requirements include: roommate gender/age, lifestyle preferences, personality traits, cleanliness, social preferences, etc.

Respond with ONLY: yes or no
`;

    try {
      const response = await this.makeAIDecision(prompt);
      return response.toLowerCase().trim().includes('yes');
    } catch (error) {
      return false;
    }
  }

  private async matchWithAI(listings: CleanListing[], naturalLanguageQuery: string, maxResults: number = 5): Promise<MatchedListing[]> {
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
   Details: ${listing.description?.substring(0, 300) || 'No description'}
   Private Room: ${listing.privateRoom ? 'Yes' : 'No'}
   Private Bath: ${listing.privateBath ? 'Yes' : 'No'}
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
                originalUrl: listing.url,
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
    if (filters.smoking === false && !listing.smoking) {
      matchingFactors.push('no smoking');
    }
    if (filters.smoking === true && listing.smoking) {
      matchingFactors.push('smoking allowed');
    }
    
    // If no specific factors, use general match
    if (matchingFactors.length === 0) {
      return `Meets all basic criteria for "${query}"`;
    }
    
    return `Matches ${matchingFactors.join(', ')} requirements`;
  }

  private async generateListingSummary(listing: CleanListing, naturalLanguageQuery: string): Promise<string> {
    const prompt = `
Summarize why this listing matches the query: "${naturalLanguageQuery}"

Listing: ${listing.title}
Price: $${listing.price}
Location: ${listing.location}
Description: ${listing.description?.substring(0, 200) || 'No description available'}

Provide a brief 1-2 sentence summary focusing on the key matching factors.
`;

    try {
      return await this.makeAIDecision(prompt);
    } catch (error) {
      return `${listing.title} - $${listing.price} in ${listing.location}`;
    }
  }

  public getSummary(): string {
    if (this.listings.length === 0) {
      return 'No listings loaded. Run scrapers first.';
    }

    const prices = this.listings.map(l => l.price).filter(p => p > 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

    const craigslistCount = this.listings.filter(l => (l as any).source === 'craigslist').length;
    const facebookCount = this.listings.filter(l => (l as any).source === 'facebook').length;

    const privateRoomCount = this.listings.filter(l => l.privateRoom).length;
    const privateBathCount = this.listings.filter(l => l.privateBath).length;

    return `
📊 Housing Market Summary:
• Total Listings: ${this.listings.length}
  - Craigslist: ${craigslistCount}
  - Facebook: ${facebookCount}
• Price Range: $${minPrice} - $${maxPrice} (avg: $${avgPrice})
• Private Room: ${privateRoomCount} listings (${Math.round(privateRoomCount/this.listings.length*100)}%)
• Private Bath: ${privateBathCount} listings (${Math.round(privateBathCount/this.listings.length*100)}%)
`;
  }

  public displayResults(listings: MatchedListing[]): void {
    if (listings.length === 0) {
      console.log('❌ No results found');
      return;
    }

    console.log(`\n🎯 Found ${listings.length} matching listings:\n`);
    
    listings.forEach((match, index) => {
      const listing = match.listing;
      const source = (listing as any).source;
      const sourceIcon = source === 'craigslist' ? '🔵' : source === 'facebook' ? '🔴' : '⚪';
      const sourceName = source === 'craigslist' ? 'Craigslist' : source === 'facebook' ? 'Facebook' : 'Unknown';
      
      console.log(`${index + 1}. ${listing.title} ${sourceIcon} ${sourceName}`);
      console.log(`   🎯 Match: ${match.matchPercentage}%`);
      console.log(`   💰 $${listing.price} | 🏠 ${listing.housingType} | 📍 ${listing.location}`);
      console.log(`   🛏️  ${listing.bedrooms}BR/${listing.bathrooms}BA | Private Room: ${listing.privateRoom ? '✅' : '❌'} | Private Bath: ${listing.privateBath ? '✅' : '❌'}`);
      console.log(`   📝 Why this score: ${match.descriptionSummary}`);
      console.log(`   🔗 ${listing.url}`);
      console.log('');
    });
  }

  // Public method for testing
  public async testSearch(query: string): Promise<MatchedListing[]> {
    return await this.search(query);
  }
}

// Standalone function for testing
export async function testHousingAgent() {
  console.log('🧪 Testing Housing Agent...');
  
  const agent = new HousingAgent();
  await agent.initialize();
  
  // Test search
  const results = await agent.testSearch('Find apartments under $2000 with private bathroom');
  
  console.log('\n📊 Search Results:');
  agent.displayResults(results);
  
  // Test summary
  console.log('\n📋 Summary:');
  console.log(agent.getSummary());
  
  return results;
}

// Run test if executed directly
if (require.main === module) {
  testHousingAgent().catch(console.error);
} 