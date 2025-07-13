# 🏠 Roomer - WeaveHacks 2025

**Finding the perfect roommate shouldn't feel like dating apps from hell.** 

Roomer is an AI-powered roommate finder that actually gets you. Instead of endlessly scrolling through sketchy Craigslist posts and Facebook groups, our multi-agent AI system does the heavy lifting - scraping listings, analyzing neighborhoods, and matching you with compatible living situations.

## 🤖 What Makes This Special

We built something pretty wild - a **multi-agent AI system using Model Context Protocol (MCP)** that treats roommate finding like the complex problem it actually is. Here's what's under the hood:

### The Agent Squad 🎯

- **🏠 Housing Agent**: Scrapes and analyzes listings from Craigslist and Facebook
- **🗺️ Location Scoring Agent**: Uses Exa AI to score neighborhoods on walkability, safety, and vibes
- **🚇 Commute Agent**: Calculates real commute times using TomTom routing
- **💬 Messenger Agent**: Handles the conversational AI chat interface  
- **🎭 Orchestrator Agent**: Coordinates everything like a conductor with ADHD

### MCP Integration ⚡

We're using **Model Context Protocol** to let our agents share context and work together seamlessly. Each agent is an MCP server that can be composed into larger workflows - basically we made our AI agents play nice with each other instead of fighting over who gets to talk.

## 🎪 Core Features

**🗺️ Smart Map Filtering**: Only see listings in your current map view - no more scrolling through places you'd never live

**🧠 AI Chat Assistant**: Press `Cmd+K` and ask things like "find me a place near good coffee shops under $1200" 

**📍 Location Intelligence**: Every listing gets scored on:
- Walk Score (can you actually walk places?)
- Bike Score (bike lane situation) 
- Transit Score (how screwed are you without a car?)
- Safety Analysis (AI reads the neighborhood vibes)

**🤝 Compatibility Matching**: Coming soon - we're building personality matching so you don't end up with a roommate who leaves dishes in the sink for weeks

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Hit up [http://localhost:3000](http://localhost:3000) and start exploring!

### Environment Setup

You'll need some API keys to make the magic happen:

```bash
EXA_API_KEY=your_exa_api_key_here
OPENAI_API_KEY=your_openai_key
TOMTOM_API_KEY=your_tomtom_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

## 🛠️ The Tech Stack

**Frontend**: Next.js 14, React, Tailwind CSS, TypeScript
**Backend**: Node.js, Supabase (PostgreSQL)
**AI**: OpenAI GPT-4, Exa AI for search
**Maps**: TomTom API for routing and maps
**Agent Framework**: Custom MCP implementation
**Data Sources**: Craigslist, Facebook Marketplace (scraped responsibly)

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │───▶│  Agent Bridge    │───▶│ Multi-Agent     │
│                 │    │                  │    │ System (MCP)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                          │
                       ┌─────────────────────────────────┼─────────────────┐
                       │                                 │                 │
                ┌──────▼──────┐  ┌──────────────┐  ┌─────▼─────┐  ┌───────▼───────┐
                │   Housing   │  │   Location   │  │  Commute  │  │  Messenger    │
                │   Agent     │  │   Scoring    │  │   Agent   │  │   Agent       │
                │             │  │   Agent      │  │           │  │               │
                └─────────────┘  └──────────────┘  └───────────┘  └───────────────┘
```

## 🎯 What We Built for WeaveHacks

This isn't just another CRUD app with a chat feature. We built:

1. **A real multi-agent system** - agents that actually coordinate and share context
2. **MCP integration** - making AI agents composable and reusable  
3. **Smart location analysis** - not just "this place exists" but "this place fits your lifestyle"
4. **Real-time data scraping** - fresh listings from multiple sources
5. **Contextual AI chat** - an assistant that actually understands roommate hunting

## 🔮 What's Next

- **Personality matching algorithm** using chat history and preferences
- **Automated roommate introductions** via the messenger agent
- **Budget optimization** suggestions based on commute costs
- **Group living coordination** for 3+ roommate situations
- **Integration with more platforms** (SpareRoom, Apartments.com, etc.)

## 🤝 The Team

Built with caffeine, determination, and probably too much ambition for a hackathon weekend.

---

*Made for WeaveHacks 2025 - where we learned that building AI agents is like herding cats, but way more fun.*
