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
exports.HousingAgent = void 0;
const dotenv_1 = require("dotenv");
const openai_1 = require("@langchain/openai");
const fs_1 = require("fs");
const readline = __importStar(require("readline"));
(0, dotenv_1.config)();
class HousingAgent {
    constructor() {
        this.listings = [];
        this.model = new openai_1.ChatOpenAI({
            modelName: 'gpt-4',
            temperature: 0.1,
        });
        this.loadListings();
    }
    loadListings() {
        const filePath = 'CraigslistData/clean-listings.json';
        if (!(0, fs_1.existsSync)(filePath)) {
            console.log('❌ No clean-listings.json found in CraigslistData folder. Run: npm run process');
            return;
        }
        try {
            const data = (0, fs_1.readFileSync)(filePath, 'utf8');
            this.listings = JSON.parse(data);
            console.log(`📂 Loaded ${this.listings.length} listings from ${filePath}`);
            // Debug: show first few listings
            if (this.listings.length > 0) {
                console.log('📋 Sample listings:');
                this.listings.slice(0, 3).forEach(listing => {
                    console.log(`  - ${listing.title}: $${listing.price} (${listing.housingType})`);
                });
            }
        }
        catch (error) {
            console.log('❌ Error loading listings:', error);
        }
    }
    // Deterministic filtering
    filterListings(filters) {
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
            // Location filter
            if (filters.location && !listing.location.toLowerCase().includes(filters.location.toLowerCase())) {
                console.log(`❌ Location mismatch: ${listing.location} does not contain ${filters.location}`);
                failedCount++;
                return false;
            }
            // If we get here, the listing passed all filters
            console.log(`✅ Passed: ${listing.title} - $${listing.price}`);
            passedCount++;
            return true;
        });
        console.log(`📊 Filter results: ${passedCount} passed, ${failedCount} failed`);
        console.log('✅ Listings after filtering:', results.length);
        return results;
    }
    // Extract deterministic filters from natural language
    async extractFilters(query) {
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
  "smoking": boolean or null,
  "location": string or null
}

Examples:
"Find houses under $2000" → {"maxPrice": 2000, "housingType": "house"}
"Show me 2+ bedroom apartments in Oakland" → {"minBedrooms": 2, "housingType": "apartment", "location": "Oakland"}
"Private bath required, no smoking" → {"privateBath": true, "smoking": false}
`;
        try {
            const response = await this.model.invoke(prompt);
            const content = response.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        }
        catch (error) {
            console.log('Error extracting filters:', error);
        }
        return {};
    }
    // AI-based natural language matching
    async matchWithAI(listings, naturalLanguageQuery, maxResults = 5) {
        if (listings.length === 0)
            return [];
        const results = [];
        for (const listing of listings.slice(0, 20)) { // Limit to first 20 for performance
            const prompt = `
Rate how well this listing matches the criteria: "${naturalLanguageQuery}"

Listing:
- Title: ${listing.title}
- Price: $${listing.price}
- Location: ${listing.location}
- Description: ${listing.description}
- Bedrooms: ${listing.bedrooms}
- Private Room: ${listing.privateRoom}
- Private Bath: ${listing.privateBath}
- Housing Type: ${listing.housingType}
- Laundry: ${listing.laundry}
- Parking: ${listing.parking}
- Smoking: ${listing.smoking}

Rate from 1-10 how well this matches the criteria.
Respond with ONLY a number (1-10).
`;
            try {
                const response = await this.model.invoke(prompt);
                const content = response.content;
                const score = parseInt(content.trim());
                if (!isNaN(score) && score >= 6) {
                    results.push({ listing, score });
                }
            }
            catch (error) {
                console.log(`Error scoring listing ${listing.id}:`, error);
            }
        }
        // Sort by score and return top results
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, maxResults).map(r => r.listing);
    }
    // Main search function
    async search(query) {
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
            return filteredListings.slice(0, 10);
        }
        // Step 4: Apply AI matching for natural language requirements
        console.log('🤖 Applying AI matching...');
        const aiMatched = await this.matchWithAI(filteredListings, query, 5);
        console.log(`🎯 ${aiMatched.length} listings match natural language criteria`);
        return aiMatched;
    }
    async hasNaturalLanguageRequirements(query) {
        const prompt = `
Does this query contain natural language requirements that can't be handled by deterministic filters?

Query: "${query}"

Deterministic filters can handle: price, bedrooms, bathrooms, housing type, private room/bath, smoking, location.

Natural language requirements include: roommate gender/age, lifestyle preferences, personality traits, cleanliness, social preferences, etc.

Respond with ONLY: yes or no
`;
        try {
            const response = await this.model.invoke(prompt);
            const content = response.content;
            return content.toLowerCase().trim().includes('yes');
        }
        catch (error) {
            return false;
        }
    }
    // Get summary stats
    getSummary() {
        if (this.listings.length === 0) {
            return 'No listings loaded. Run: npm run process';
        }
        const prices = this.listings.map(l => l.price).filter(p => p > 0);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        const housingTypes = this.listings.reduce((acc, l) => {
            acc[l.housingType] = (acc[l.housingType] || 0) + 1;
            return acc;
        }, {});
        return `📊 ${this.listings.length} listings loaded
💰 Price: $${minPrice} - $${maxPrice} (avg: $${avgPrice})
🏠 Types: ${Object.entries(housingTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}`;
    }
    // Display results
    displayResults(listings) {
        if (listings.length === 0) {
            console.log('❌ No results found');
            return;
        }
        console.log(`\n🎯 Found ${listings.length} results:\n`);
        listings.forEach((listing, index) => {
            console.log(`${index + 1}. ${listing.title}`);
            console.log(`   💰 $${listing.price} | 🏠 ${listing.housingType} | 📍 ${listing.location}`);
            console.log(`   🛏️  ${listing.bedrooms}BR/${listing.bathrooms}BA | Private Room: ${listing.privateRoom ? '✅' : '❌'} | Private Bath: ${listing.privateBath ? '✅' : '❌'}`);
            console.log(`   📝 ${listing.description.substring(0, 100)}...`);
            console.log('');
        });
    }
}
exports.HousingAgent = HousingAgent;
// Interactive chat
async function startChat() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    console.log('🏠 Housing Search Agent');
    console.log('Ask natural language questions about housing!');
    console.log('Examples:');
    console.log('- "Find houses under $2000 with female roommates"');
    console.log('- "Show me apartments in Oakland with private bathrooms"');
    console.log('- "Find quiet places for young professionals"');
    console.log('Type "quit" to exit, "summary" for stats.\n');
    const agent = new HousingAgent();
    console.log(agent.getSummary() + '\n');
    const askQuestion = () => {
        rl.question('You: ', async (input) => {
            if (input.toLowerCase() === 'quit') {
                rl.close();
                return;
            }
            if (input.toLowerCase() === 'summary') {
                console.log(agent.getSummary());
                askQuestion();
                return;
            }
            try {
                const results = await agent.search(input);
                agent.displayResults(results);
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
    startChat();
}
