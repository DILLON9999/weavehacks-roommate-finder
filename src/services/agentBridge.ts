import { Listing } from '@/types/listing';

export interface AgentResponse {
  success: boolean;
  results: Listing[];
  error?: string;
}

export interface AgentQuery {
  message: string;
  userId?: string;
}

export class AgentBridge {
  private static instance: AgentBridge;
  private agentServerUrl: string;
  private serverCheckTimeout: number = 30000; // 30 seconds

  private constructor() {
    this.agentServerUrl = process.env.AGENT_SERVER_URL || 'http://localhost:3001';
  }

  public static getInstance(): AgentBridge {
    if (!AgentBridge.instance) {
      AgentBridge.instance = new AgentBridge();
    }
    return AgentBridge.instance;
  }

  public async queryAgent(query: AgentQuery): Promise<AgentResponse> {
    try {
      console.log('🔍 AgentBridge: Making HTTP request to agent server...');
      
      // Ensure agent server is running
      await this.ensureAgentServerRunning();
      
      // Make HTTP request to agent server
      const response = await fetch(`${this.agentServerUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.message }),
        signal: AbortSignal.timeout(60000) // 60 second timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Agent server returned ${response.status}: ${errorData.error || response.statusText}`);
      }

      const agentData = await response.json();
      console.log('✅ AgentBridge: Received response from agent server:', agentData.results?.length || 0, 'results');

      if (!agentData.success) {
        return {
          success: false,
          results: [],
          error: agentData.error || 'Agent server returned unsuccessful response'
        };
      }

      // Convert agent results to frontend listing format
      const listings = this.convertAgentResultsToListings(agentData.results || []);
      
      return {
        success: true,
        results: listings
      };
    } catch (error) {
      console.error('🔧 AgentBridge: HTTP request failed:', error);
      return {
        success: false,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error communicating with agent server'
      };
    }
  }

  private async ensureAgentServerRunning(): Promise<void> {
    try {
      // Check if server is already running
      const healthResponse = await fetch(`${this.agentServerUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });

      if (healthResponse.ok) {
        console.log('✅ AgentBridge: Agent server is already running');
        return;
      }
    } catch {
      console.log('🔧 AgentBridge: Agent server not responding, it may need to be started manually');
      console.log('💡 Run: npm run agent:server');
      throw new Error(
        'Agent server is not running. Please start it with: npm run agent:server'
      );
    }
  }

  private convertAgentResultsToListings(agentResults: unknown): Listing[] {
    if (!Array.isArray(agentResults)) {
      console.log('🔧 AgentBridge: agentResults is not an array:', typeof agentResults);
      return [];
    }
    
    console.log('🔧 AgentBridge: Converting', agentResults.length, 'agent results to listings');
    
    return agentResults.map((result: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultObj = result as Record<string, any>;
      
      console.log('🔧 AgentBridge: Converting result:', {
        id: resultObj.id,
        title: resultObj.title,
        price: resultObj.price,
        matchScore: resultObj.combinedScore || resultObj.scores?.combined,
        explanation: resultObj.explanation
      });
      
      // The agent system returns the listing data directly
      const listing: Listing = {
        url: resultObj.url || '',
        title: resultObj.title || '',
        price: resultObj.price?.toString() || '',
        location: resultObj.location || '',
        description: resultObj.description || '',
        coordinates: {
          latitude: resultObj.coordinates?.latitude?.toString() || resultObj.latitude?.toString() || '0',
          longitude: resultObj.coordinates?.longitude?.toString() || resultObj.longitude?.toString() || '0'
        },
        images: resultObj.images || [],
        details: resultObj.details || [],
        postedDate: resultObj.postedDate || '',
        attributes: {
          bedrooms: resultObj.bedrooms || resultObj.attributes?.bedrooms,
          bathrooms: resultObj.bathrooms || resultObj.attributes?.bathrooms,
          availableDate: resultObj.availableDate || resultObj.attributes?.availableDate,
          privateRoom: resultObj.privateRoom ?? resultObj.attributes?.privateRoom,
          housingType: resultObj.housingType || resultObj.attributes?.housingType,
          privateBath: resultObj.privateBath ?? resultObj.attributes?.privateBath,
          laundry: resultObj.laundry || resultObj.attributes?.laundry,
          parking: resultObj.parking || resultObj.attributes?.parking,
          smoking: resultObj.smoking ?? resultObj.attributes?.smoking
        },
        // Agent system extensions - properly map the fields
        matchScore: resultObj.combinedScore || resultObj.scores?.combined || resultObj.scores?.housing,
        explanation: resultObj.explanation,
        commuteAnalysis: resultObj.commuteAnalysis,
        scores: resultObj.scores,
        source: resultObj.source
      };

      console.log('🔧 AgentBridge: Converted listing:', {
        title: listing.title,
        price: listing.price,
        matchScore: listing.matchScore,
        explanation: listing.explanation
      });

      return listing;
    });
  }
} 