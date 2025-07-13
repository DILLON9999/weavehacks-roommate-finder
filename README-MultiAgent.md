# 🎭 Multi-Agent Housing Search System

An intelligent housing search system powered by multiple AI agents working together using Google's a2a (agent-to-agent) communication framework.

## 🏗️ Architecture

### Agents Overview

| Agent | Purpose | Capabilities |
|-------|---------|--------------|
| **🏠 Housing Agent** | Find and filter roommate listings | Search listings, apply filters, natural language matching |
| **🚗 Commute Agent** | Analyze travel times and routes | Distance calculation, traffic analysis, commute scoring |
| **💰 Budget Agent** | *(Coming Soon)* | Budget analysis, cost optimization |
| **🎯 Lifestyle Agent** | *(Coming Soon)* | Lifestyle matching, preference analysis |

### Agent Communication

The system uses a **full mesh network** where all agents can communicate directly:

```
┌─────────────────┐    ┌─────────────────┐
│  Housing Agent  │◄──►│  Commute Agent  │
│                 │    │                 │
└─────────────────┘    └─────────────────┘
         ▲                       ▲
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Budget Agent   │◄──►│ Lifestyle Agent │
│  (Coming Soon)  │    │  (Coming Soon)  │
└─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Install dependencies
npm install

# Setup environment variables
echo "OPENAI_API_KEY=your_openai_key" >> .env
```

### 2. Get API Keys

#### OpenAI API Key (Required)
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to `.env` file

#### TomTom Maps API (Integrated via MCP)
The system now uses TomTom Maps via MCP server for enhanced commute analysis:
- Real-time traffic incidents
- Alternative route suggestions  
- Detailed traffic analysis
- No API key setup required (handled by MCP)

> **Note:** If TomTom MCP is unavailable, the system will use mock commute data

### 3. Prepare Data

```bash
# Scrape housing data (if you haven't already)
npm run scrape 20
```

### 4. Run Multi-Agent System

```bash
# Start the multi-agent chat
npm run multi-agent
```

## 💬 Usage Examples

### Basic Housing Search
```
You: Find apartments under $2000 with private bathroom
```

### Housing + Commute Analysis
```
You: Show me houses with easy commute to 1 Hacker Way, Menlo Park
You: Find rooms near BART with commute to downtown San Francisco
You: Apartments under $1500 with commute to Stanford University
```

### Advanced Queries
```
You: Female roommates, private bath, close to public transit
You: Quiet places for young professionals with short commute to tech companies
```

## 🔧 System Commands

| Command | Description |
|---------|-------------|
| `quit` | Exit the system |
| `status` | Show system status and agent information |

## 📊 Enhanced Features

### Scoring System

Each listing gets multiple scores that are combined into an overall rating:

```typescript
{
  overallScore: 85,  // Combined weighted score
  scores: {
    housing: 90,     // Housing match percentage
    commute: 75,     // Commute quality (1-10 scale × 10)
    budget: 80,      // (Coming Soon)
    lifestyle: 85    // (Coming Soon)
  }
}
```

### Commute Analysis

For each listing, the system provides:
- **Distance**: Actual distance to work location
- **Duration**: Normal travel time
- **Traffic Impact**: Travel time during peak hours
- **Rating**: 1-10 commute quality score
- **Recommendation**: AI-generated commute assessment

### Sample Output

```
🎯 Found 3 enhanced results:

1. Spacious Room in Modern House 🔵 Craigslist
   🎯 Overall Score: 87%
   📊 Scores: Housing: 95% | Commute: 75%
   💰 $1800 | 🏠 house | 📍 Palo Alto, CA
   🛏️  3BR/2BA | Private Room: ✅ | Private Bath: ✅
   🚗 Commute: 12.3 km (18 mins / 25 mins in traffic)
   🎯 Commute Rating: 7.5/10 - Good commute with moderate traffic
   🔗 View original: https://...
```

## 🛠️ Development

### Agent Architecture

Each agent extends the `BaseAgent` class:

```typescript
export class TomTomCommuteAgent extends BaseAgent {
  constructor() {
    super('TomTomCommuteAgent');
  }
  
  async initialize(): Promise<void> {
    // Agent initialization
  }
  
  getCapabilities(): AgentCapability[] {
    // Define what this agent can do
  }
}
```

### Adding New Agents

1. **Create Agent Class**
   ```typescript
   // agents/budget-agent.ts
   export class BudgetAgent extends BaseAgent {
     // Implementation
   }
   ```

2. **Register with Coordinator**
   ```typescript
   // multi-agent-system.ts
   this.coordinator.registerAgent(new BudgetAgent());
   ```

3. **Integrate in Processing Pipeline**
   ```typescript
   // Add budget analysis step
   enhancedListings = await this.addBudgetAnalysis(enhancedListings);
   ```

### Testing Individual Agents

```bash
# Test TomTom commute agent
npm run tomtom-commute

# Test housing agent
npm run chat
```

## 🧪 Testing

### Test TomTom Commute Agent

```typescript
import { testTomTomCommuteAgent } from './agents/commute-agent-tomtom';

// This will test with TomTom MCP integration
await testTomTomCommuteAgent();
```

### TomTom Integration

The system now uses TomTom MCP server for real-time commute analysis with enhanced features:

```
🚗 TomTom Commute Agent ready
✅ Real-time traffic analysis with incident detection
```

## 📋 API Reference

### Agent Messages

```typescript
interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent: string;
  type: 'request' | 'response' | 'broadcast';
  action: string;
  payload: any;
  timestamp: Date;
}
```

### Commute Analysis Request

```typescript
{
  homeLocation: { address: "123 Main St, San Francisco" },
  workLocation: { address: "1 Hacker Way, Menlo Park" },
  travelMode: "driving" | "walking" | "bicycling" | "transit"
}
```

### Commute Analysis Response

```typescript
{
  distance: { text: "35.2 km", value: 35200 },
  duration: { text: "42 mins", value: 2520 },
  durationInTraffic: { text: "58 mins", value: 3480 },
  rating: 6.8,
  recommendation: "Moderate commute with heavy traffic during peak hours"
}
```

## 🔮 Roadmap

### Phase 2: Budget Agent
- [ ] Budget analysis and optimization
- [ ] Cost-of-living calculations
- [ ] Financial recommendations

### Phase 3: Lifestyle Agent  
- [ ] Personality matching
- [ ] Lifestyle compatibility analysis
- [ ] Social preferences

### Phase 4: Advanced Features
- [ ] Machine learning for preference learning
- [ ] Real-time market analysis
- [ ] Notification system for new matches

## 🤝 Contributing

1. **Add New Agent**: Follow the agent architecture pattern
2. **Enhance Existing Agents**: Add new capabilities and handlers
3. **Improve Scoring**: Refine the weighted scoring algorithm
4. **Add Data Sources**: Integrate additional housing platforms

## 📝 Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...

# TomTom integration via MCP (no API key needed)
# The MCP server handles TomTom authentication

# Optional (for future enhanced features)
BUDGET_API_KEY=...
TRANSIT_API_KEY=...
```

## 🔍 Troubleshooting

### Common Issues

1. **No listings found**: Run `npm run scrape` to get housing data
2. **TomTom MCP required**: Ensure TomTom MCP server is configured for commute analysis
3. **Agent connection errors**: Check that all agents are properly initialized

### Debug Mode

```bash
# Enable verbose logging
DEBUG=true npm run multi-agent
```

---

**Built with ❤️ using Google a2a framework, LangChain, and TypeScript** 