# 🏠 Craigslist Housing Scraper

Clean, simple TypeScript scraper for Craigslist roommate listings with AI-powered search.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up your API keys
echo "OPENAI_API_KEY=your_key_here" > .env
echo "MAPBOX_ACCESS_TOKEN=your_mapbox_token_here" >> .env

# 1. Scrape listings (automatically processes data)
npm run scrape 10

# 2. Start AI chat
npm run chat
```

## 📋 Commands

| Command | Description |
|---------|-------------|
| `npm run scrape <number>` | Scrape N listings with full details and auto-process |
| `npm run chat` | AI-powered housing search chat |

## 🔧 Workflow

### 1. Scrape & Process Data
```bash
npm run scrape 20  # Scrape 20 listings
```
Creates:
- `CraigslistData/listings.json` - Raw scraped data
- `CraigslistData/clean-listings.json` - Clean data without images (for AI)
- `CraigslistData/images.json` - Mapping of listing IDs to image URLs

### 2. Search with AI
```bash
npm run chat
```

## 🤖 AI Search Features

The agent uses a **two-step process**:

### Step 1: Deterministic Filters
Handles concrete criteria:
- Price range
- Bedrooms/bathrooms
- Housing type (house/apartment/condo)
- Private room/bath requirements
- Smoking preferences
- Location

### Step 2: Natural Language Matching
For complex criteria like:
- "female roommates"
- "young professionals"
- "quiet environment"
- "clean and organized"
- "social atmosphere"

## 💬 Example Queries

```
"Find houses under $2000 with female roommates"
"Show me apartments in Oakland with private bathrooms"
"Find quiet places for young professionals"
"2+ bedrooms, no smoking, with parking"
```

## 📊 Data Structure

### Clean Listings
```typescript
{
  id: string;
  title: string;
  price: number;
  location: string;
  description: string;
  coordinates: { latitude: number; longitude: number };
  bedrooms: number;
  bathrooms: number;
  privateRoom: boolean;
  privateBath: boolean;
  housingType: string;
  // ... more attributes
}
```

### Images Mapping
```typescript
{
  "listingId": ["image1.jpg", "image2.jpg", ...]
}
```

## 🤖 Multi-Agent System

Advanced AI orchestration with multiple specialized agents:

```bash
# Run the full multi-agent system
npm run multi-agent
```

### Agents
- **OrchestratorAgent** - AI-powered query analysis and agent coordination
- **HousingAgent** - Search listings with explanatory scoring
- **MapboxCommuteAgent** - Real-time commute analysis with traffic data

### Example Queries
```
"Find a 2BR under $3000 with a close commute to Stanford University"
"Show me pet-friendly apartments near downtown with parking"
"I need a place with good commute to 1 Hacker Way, Menlo Park"
```

## 🗺️ Mapbox Setup

For commute analysis, you need a Mapbox MCP server:

1. Get a Mapbox API token from [mapbox.com](https://mapbox.com)
2. Add to your `.env` file: `MAPBOX_ACCESS_TOKEN=your_token_here`
3. Run the Mapbox MCP server on port 9000:
   ```bash
   # Install and run Mapbox MCP server (separate terminal)
   # Follow Mapbox MCP documentation for setup
   ```

## 🎯 Architecture

1. **scraper.ts** - Unified scraping function with auto-processing
2. **agents/housing-agent.ts** - BaseAgent-conformant housing search
3. **agents/commute-agent-mapbox.ts** - Mapbox-powered commute analysis
4. **agents/orchestrator-agent.ts** - AI query analysis and coordination
5. **multi-agent-system.ts** - Orchestrated multi-agent execution
6. **CraigslistData/listings.json** - Raw scraped data
7. **CraigslistData/clean-listings.json** - Processed data for AI
8. **CraigslistData/images.json** - Image URLs by listing ID

---

**Clean. Simple. Effective.** 🎯 