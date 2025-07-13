# Housing Data Collector with MCP Multi-Agent System

A housing search system that scrapes listings from Craigslist and Facebook, then uses a multi-agent architecture to help you find places that match your preferences and commute needs.

## What it does

- **Scrapes housing data** from Craigslist and Facebook Marketplace
- **Searches listings** using natural language queries
- **Analyzes commutes** to your work location using TomTom routing
- **Ranks results** by combining housing preferences with commute analysis
- **Uses AI agents** that work together to give you better recommendations

## What makes this different

This project uses **Model Context Protocol (MCP)** - a new standard that lets AI agents communicate with each other in a structured way. Instead of one big AI trying to do everything, we have specialized agents:

- **Housing Agent**: Searches and filters listings
- **Commute Agent**: Analyzes travel times and routes  
- **Orchestrator Agent**: Coordinates everything and decides which agents to use

The MCP architecture means:
- Agents can work in parallel (faster searches)
- Each agent is specialized (better results)
- Easy to add new agents or data sources
- Agents communicate through standardized interfaces

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```
   
   You need:
   - `OPENAI_API_KEY` - For AI processing
   - `TOMTOM_API_KEY` - For commute analysis

3. **Scrape some data** (optional - sample data included)
   ```bash
   node scraper.js
   ```

4. **Run the system**
   ```bash
   npm start
   # or
   node multi-agent-system-mcp.js
   ```

## How to use

Just ask in natural language:

```
"Find apartments under $2000 with private bathroom near Stanford"
"Show me places with good commute to downtown SF"
"I need a room for a female, clean, no smoking"
```

The system will:
1. Parse your request and extract filters
2. Search housing listings 
3. Analyze commutes if you mention a work location
4. Rank everything and show you the best matches

## File structure

```
agents/
├── mcp-base-agent.ts       # Base MCP agent functionality
├── housing-agent-mcp.ts    # Housing search and filtering
├── commute-agent-mcp.ts    # Route analysis with TomTom
└── orchestrator-agent-mcp.ts # Coordinates other agents

multi-agent-system-mcp.ts   # Main system entry point
scraper.ts                  # Data collection from Craigslist/Facebook
```

## Data sources

- **Craigslist**: Rooms, apartments, houses
- **Facebook Marketplace**: Housing listings
- **TomTom**: Real-time traffic and routing data

The scraped data gets cleaned and standardized so all agents can work with it consistently.

## Why MCP?

Traditional approaches either use one massive prompt (slow, limited) or hard-coded integrations (brittle, hard to extend). MCP gives you:

- **Modularity**: Each agent does one thing well
- **Parallelization**: Multiple agents can work simultaneously  
- **Extensibility**: Easy to add new agents or capabilities
- **Standardization**: Agents communicate through well-defined interfaces
- **Debugging**: You can see exactly what each agent is doing

It's like having a team of specialists who know how to work together, instead of one person trying to be an expert at everything. 