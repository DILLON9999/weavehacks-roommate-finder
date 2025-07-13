# 🏠 Craigslist Housing Scraper

Clean, simple TypeScript scraper for Craigslist roommate listings with AI-powered search.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up your OpenAI API key
echo "OPENAI_API_KEY=your_key_here" > .env

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

## 🎯 Architecture

1. **scraper.ts** - Unified scraping function with auto-processing
2. **housing-agent.ts** - AI-powered search with deterministic + NL filtering
3. **CraigslistData/listings.json** - Raw scraped data
4. **CraigslistData/clean-listings.json** - Processed data for AI
5. **CraigslistData/images.json** - Image URLs by listing ID

---

**Clean. Simple. Effective.** 🎯 