import { config } from 'dotenv';
import * as readline from 'readline';
import { OrchestratorAgentMCP } from './orchestrator-agent-mcp';
import { CleanListing } from './scraper';
import * as weave from 'weave';

config();

// Enhanced interfaces for MCP multi-agent system
interface EnhancedListing extends CleanListing {
  source?: string;
  commuteAnalysis?: {
    rating: number;
    distance: string;
    duration: string;
    durationInTraffic?: string;
    recommendation: string;
  };
  locationAnalysis?: {
    walkScore: number;
    bikeScore: number;
    transitScore: number;
    safetySentiment: string;
  };
  combinedScore?: number;
  scores?: {
    housing?: number;
    commute?: number;
    location?: number;
    combined?: number;
  };
  explanation?: string;
  images?: string[];
}

// Main MCP Multi-Agent System
export class MCPMultiAgentHousingSystem {
  private orchestrator: OrchestratorAgentMCP;

  constructor() {
    this.orchestrator = new OrchestratorAgentMCP();
  }

  async initialize(): Promise<void> {
    console.log('🎭 Initializing MCP Multi-Agent Housing System...');
    console.log('🔧 This system uses Model Context Protocol for agent communication');
    
    // Initialize Weave if API key is available
    if (process.env.WEAVE_API_KEY) {
      try {
        await weave.init('housing-data-collector');
        console.log('🎯 Weave initialized for tracking LLM calls and agent operations');
      } catch {
        console.warn('⚠️ Weave initialization failed');
      }
    } else {
      console.log('💡 Add WEAVE_API_KEY to your .env to enable Weave tracking');
    }
    
    console.log('');
    
    // Initialize the orchestrator (which will initialize all sub-agents)
    await this.orchestrator.initializeMCP();
    
    console.log('✅ MCP Multi-Agent System ready!');
    console.log('📊 System Architecture:');
    console.log('  🎭 OrchestratorAgentMCP (Main coordinator)');
    console.log('    ├── 🏠 HousingAgentMCP (Housing search via MCP)');
    console.log('    ├── 🗺️ CommuteAgentMCP (Commute analysis via MCP)');
    console.log('    └── 💬 MessengerAgentMCP (Facebook messaging via MCP)');
    console.log('');
  }

  async processQuery(query: string): Promise<EnhancedListing[]> {
    console.log(`\n🔍 Processing query: "${query}"`);
    
    // Wrap with Weave if available
    if (process.env.WEAVE_API_KEY) {
      const processQueryWithWeave = weave.op(this.processQueryInternal.bind(this), { 
        name: 'process_user_query' 
      });
      return await processQueryWithWeave(query);
    } else {
      return await this.processQueryInternal(query);
    }
  }

  private async processQueryInternal(query: string): Promise<EnhancedListing[]> {
    try {
      // Use the orchestrator to handle the entire query
      const result = await this.orchestrator.processQuery(query);
      
      if (!result.success) {
        console.log(`❌ Query processing failed: ${result.reasoning}`);
        return [];
      }

      console.log(`✅ Query processed successfully using agents: ${result.agentsUsed.join(', ')}`);
      console.log(`🎯 Intent: ${result.intent}`);
      console.log(`💭 Reasoning: ${result.reasoning}`);

      // Convert results to EnhancedListing format
      if (result.results && Array.isArray(result.results)) {
        return this.convertToEnhancedListings(result.results);
      }

      return [];
    } catch (error) {
      console.log('❌ Error processing query:', error);
      return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private convertToEnhancedListings(results: any[]): EnhancedListing[] {
    return results.map(result => {
      const listing = result.listing || result;
      const enhanced: EnhancedListing = {
        ...listing,
        source: listing.source || 'unknown'
      };

      // Add scores if available
      if (result.scores) {
        enhanced.scores = result.scores;
        enhanced.combinedScore = result.combinedScore || result.scores.combined;
      } else if (result.matchPercentage) {
        enhanced.scores = { housing: result.matchPercentage };
        enhanced.combinedScore = result.matchPercentage;
      }

      // Add commute analysis if available
      if (result.commuteAnalysis) {
        enhanced.commuteAnalysis = {
          rating: result.commuteAnalysis.rating,
          distance: result.commuteAnalysis.distance.text,
          duration: result.commuteAnalysis.duration.text,
          durationInTraffic: result.commuteAnalysis.durationInTraffic?.text,
          recommendation: result.commuteAnalysis.recommendation
        };
      }

      // Add explanation
      if (result.explanation) {
        enhanced.explanation = result.explanation;
      } else if (result.descriptionSummary) {
        enhanced.explanation = result.descriptionSummary;
      }

      return enhanced;
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
      
      // Show combined score prominently
      if (listing.combinedScore !== undefined) {
        console.log(`   🎯 Overall Score: ${listing.combinedScore}%`);
      }
      
      // Show individual scores
      if (listing.scores) {
        const scoreDetails = [];
        if (listing.scores.housing) scoreDetails.push(`Housing: ${listing.scores.housing}%`);
        if (listing.scores.commute) scoreDetails.push(`Commute: ${listing.scores.commute}%`);
        if (scoreDetails.length > 0) {
          console.log(`   📊 Component Scores: ${scoreDetails.join(' | ')}`);
        }
      }
      
      console.log(`   💰 $${listing.price} | 🏠 ${listing.housingType} | 📍 ${listing.location}`);
      console.log(`   🛏️  ${listing.bedrooms}BR/${listing.bathrooms}BA | Private Room: ${listing.privateRoom ? '✅' : '❌'} | Private Bath: ${listing.privateBath ? '✅' : '❌'}`);
      
      // Show explanation if available
      if (listing.explanation) {
        console.log(`   📝 Match Explanation: ${listing.explanation}`);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getSystemStatus(): Promise<any> {
    try {
      // Get capabilities from the orchestrator
      const capabilities = await this.orchestrator.handleMessage({
        id: `status-${Date.now()}`,
        fromAgent: 'system',
        toAgent: this.orchestrator.id,
        type: 'request',
        action: 'mcp_call_tool',
        payload: {
          name: 'get_agent_capabilities',
          arguments: {}
        },
        timestamp: new Date()
      });

      if (capabilities.success) {
        const capData = JSON.parse(capabilities.data.content[0].text);
        return {
          system: 'MCP Multi-Agent Housing System',
          orchestrator: this.orchestrator.name,
          agentCapabilities: capData.capabilities
        };
      }

      return {
        system: 'MCP Multi-Agent Housing System',
        orchestrator: this.orchestrator.name,
        status: 'Active'
      };
    } catch {
      return {
        system: 'MCP Multi-Agent Housing System',
        error: 'Could not retrieve status'
      };
    }
  }

  // Demonstrate MCP capabilities
  async demonstrateMCPCapabilities(): Promise<void> {
    console.log('\n🔧 MCP System Capabilities Demonstration:');
    console.log('========================================');

    try {
      // Get all agent capabilities
      const capResult = await this.orchestrator.handleMessage({
        id: `demo-${Date.now()}`,
        fromAgent: 'demo',
        toAgent: this.orchestrator.id,
        type: 'request',
        action: 'mcp_call_tool',
        payload: {
          name: 'get_agent_capabilities',
          arguments: {}
        },
        timestamp: new Date()
      });

      if (capResult.success) {
        const capabilities = JSON.parse(capResult.data.content[0].text);
        
        console.log('\n📋 Available Agents and Their MCP Tools:');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const [agentName, agentCaps] of Object.entries(capabilities.capabilities as any)) {
          console.log(`\n🤖 ${agentName.toUpperCase()} AGENT:`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (agentCaps && (agentCaps as any).tools) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (agentCaps as any).tools.forEach((tool: any) => {
              console.log(`  🔧 ${tool.name}: ${tool.description}`);
            });
          }
        }
      }

      console.log('\n🎭 Orchestrator MCP Tools:');
      const orchestratorTools = this.orchestrator.getMCPTools();
      orchestratorTools.forEach(tool => {
        console.log(`  🔧 ${tool.name}: ${tool.description}`);
      });

      console.log('\n✨ This demonstrates how MCP enables:');
      console.log('  • Dynamic agent capability discovery');
      console.log('  • Standardized tool interfaces');
      console.log('  • Flexible agent-to-agent communication');
      console.log('  • Runtime tool composition and orchestration');
      
    } catch (error) {
      console.log('❌ Could not demonstrate MCP capabilities:', error);
    }
  }
}

// Interactive chat with MCP multi-agent system
async function startMCPMultiAgentChat() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('🎭 MCP Multi-Agent Housing Search System');
  console.log('Powered by Model Context Protocol!');
  console.log('');
  console.log('🔧 MCP Features:');
  console.log('• Dynamic agent capability discovery');
  console.log('• Standardized tool interfaces');
  console.log('• Agent-to-agent communication via MCP');
  console.log('• Runtime orchestration and composition');
  console.log('');
  console.log('Enhanced capabilities:');
  console.log('• Comprehensive housing search via MCP');
  console.log('• Commute analysis via MCP + Mapbox');
  console.log('• Intelligent query analysis and orchestration');
  console.log('• Combined scoring with multiple factors');
  console.log('');
  console.log('Examples:');
  console.log('- "Find apartments under $2000 near downtown"');
  console.log('- "Show me houses with easy commute to 1 Hacker Way, Menlo Park"');
  console.log('- "Female roommates, private bath, close to BART"');
  console.log('');
  console.log('Commands:');
  console.log('- Type "quit" to exit');
  console.log('- Type "status" for system info');
  console.log('- Type "demo" to see MCP capabilities');
  console.log('');

  const system = new MCPMultiAgentHousingSystem();
  await system.initialize();

  const askQuestion = () => {
    rl.question('\nYou: ', async (input) => {
      if (input.toLowerCase() === 'quit') {
        rl.close();
        return;
      }

      if (input.toLowerCase() === 'status') {
        console.log('\n📊 System Status:');
        const status = await system.getSystemStatus();
        console.log(JSON.stringify(status, null, 2));
        askQuestion();
        return;
      }

      if (input.toLowerCase() === 'demo') {
        await system.demonstrateMCPCapabilities();
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
export type { EnhancedListing };

// Handle command line arguments for service mode
async function handleServiceMode() {
  const args = process.argv.slice(2);
  console.log('🔧 Agent system received args:', args);
  
  const queryIndex = args.findIndex(arg => arg === '--query');
  console.log('🔧 Query index:', queryIndex);
  
  if (queryIndex !== -1 && queryIndex + 1 < args.length) {
    const query = args[queryIndex + 1];
    console.log('🔧 Extracted query:', query);
    
    try {
      const system = new MCPMultiAgentHousingSystem();
      await system.initialize();
      const results = await system.processQuery(query);
      
      // Output JSON for the bridge to consume
      console.log(JSON.stringify({
        success: true,
        results: results,
        query: query
      }));
    } catch (error) {
      console.log(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
    return;
  }
  
  console.log('🔧 No --query argument found, falling back to interactive mode');
  // Fall back to interactive mode
  await startMCPMultiAgentChat();
}

// Run interactive chat if executed directly
if (require.main === module) {
  handleServiceMode();
} 