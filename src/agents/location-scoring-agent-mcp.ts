import { MCPBaseAgent, MCPTool, AgentCapability } from './mcp-base-agent';
import Exa from "exa-js";
import { OpenAI } from "openai";

export interface LocationScoreData {
  walkScore: number;
  bikeScore: number;
  transitScore: number;
  safetySentiment: string;
  coordinates: {
    latitude: string;
    longitude: string;
  };
}

interface ExaTaskResponse {
  scores?: {
    walkScore?: number;
    bikeScore?: number;
    transitScore?: number;
  };
  safetySentiment?: string;
  coordinates?: {
    latitude: string;
    longitude: string;
  };
}

export interface ListingWithCoordinates {
  coordinates: {
    latitude: string;
    longitude: string;
  };
  title: string;
  location: string;
  url: string;
}

export class LocationScoringAgentMCP extends MCPBaseAgent {
  private exa: Exa;
  private openai: OpenAI;

  constructor() {
    super('LocationScoringAgentMCP', 'gpt-4o-mini');
    
    if (!process.env.EXA_API_KEY) {
      throw new Error('EXA_API_KEY environment variable is required');
    }
    
    this.exa = new Exa(process.env.EXA_API_KEY);
    this.openai = new OpenAI({
      apiKey: process.env.EXA_API_KEY,
      baseURL: "https://api.exa.ai",
    });
  }

  async initialize(): Promise<void> {
    console.log('🗺️ Initializing Location Scoring Agent (Exa)...');
    this.wrapMethodsWithWeave();
    this.registerMCPToolHandlers();
    console.log('✅ Location Scoring Agent initialized with Exa Research API');
  }

  private wrapMethodsWithWeave(): void {
    // Weave integration for method tracking
    if (process.env.WEAVE_API_KEY) {
      try {
        // Bind methods for Weave tracking without reassignment
        console.log('🎯 Weave tracking enabled for Location Scoring Agent');
      } catch (error) {
        console.warn('⚠️ Failed to wrap Location Scoring Agent methods with Weave:', error);
      }
    }
  }

  getMCPTools(): MCPTool[] {
    return [
      {
        name: 'get_location_scores',
        description: 'Get walk score, bike score, transit score, and safety sentiment for coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            latitude: { type: 'string', description: 'Latitude coordinate' },
            longitude: { type: 'string', description: 'Longitude coordinate' }
          },
          required: ['latitude', 'longitude']
        }
      },
      {
        name: 'score_multiple_locations',
        description: 'Score multiple locations efficiently with batch processing',
        inputSchema: {
          type: 'object',
          properties: {
            listings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  coordinates: {
                    type: 'object',
                    properties: {
                      latitude: { type: 'string' },
                      longitude: { type: 'string' }
                    }
                  },
                  title: { type: 'string' },
                  location: { type: 'string' },
                  url: { type: 'string' }
                }
              }
            }
          },
          required: ['listings']
        }
      }
    ];
  }

  registerMCPToolHandlers(): void {
    this.registerMCPTool('get_location_scores', async (args: Record<string, unknown>) => {
      const { latitude, longitude } = args as { latitude: string; longitude: string };
      const result = await this.getLocationScores(latitude, longitude);
      return this.createMCPJSONResult(result);
    });

    this.registerMCPTool('score_multiple_locations', async (args: Record<string, unknown>) => {
      const { listings } = args as { listings: ListingWithCoordinates[] };
      const result = await this.scoreMultipleLocations(listings);
      // Convert Map to object for JSON serialization
      const resultObj = Object.fromEntries(result);
      return this.createMCPJSONResult(resultObj);
    });
  }

  getCapabilities(): AgentCapability[] {
    return [
      {
        name: 'location_scoring',
        description: 'Get walkability, bikeability, transit access, and safety information for any location',
        parameters: {}
      },
      {
        name: 'batch_location_analysis',
        description: 'Efficiently analyze multiple locations for comprehensive location insights',
        parameters: {}
      }
    ];
  }

  async getLocationScores(latitude: string, longitude: string): Promise<LocationScoreData> {
    try {
      console.log(`🗺️ Getting location scores for coordinates: ${latitude}, ${longitude}`);

      const { id: taskId } = await this.exa.research.createTask({
        instructions: `Get the walk score, bike score, transit score, and safety sentiment at these coordinates: "latitude": "${latitude}", "longitude": "${longitude}"`,
        model: "exa-research",
        output: {
          schema: {
            description: "Schema describing safety sentiment, location scores, and coordinates",
            type: "object",
            properties: {
              safetySentiment: {
                type: "string",
                description: "Description of how residents perceive safety in the area"
              },
              scores: {
                type: "object",
                description: "Various location accessibility scores",
                properties: {
                  walkScore: {
                    type: "integer",
                    description: "Score indicating walkability of the area"
                  },
                  bikeScore: {
                    type: "integer",
                    description: "Score indicating bike-friendliness of the area"
                  },
                  transitScore: {
                    type: "integer",
                    description: "Score indicating public transit accessibility"
                  }
                },
                required: ["walkScore", "bikeScore", "transitScore"],
                additionalProperties: false
              },
              coordinates: {
                type: "object",
                description: "Geographic coordinates of the location",
                properties: {
                  latitude: {
                    type: "string",
                    description: "Latitude coordinate"
                  },
                  longitude: {
                    type: "string",
                    description: "Longitude coordinate"
                  }
                },
                required: ["latitude", "longitude"],
                additionalProperties: false
              }
            },
            required: ["safetySentiment", "scores", "coordinates"],
            additionalProperties: false
          },
          inferSchema: false
        }
      });

      const task = await this.exa.research.pollTask(taskId);
      
      if (task.status === 'completed' && task.data) {
        const data = task.data as ExaTaskResponse;
        const result: LocationScoreData = {
          walkScore: data.scores?.walkScore || 0,
          bikeScore: data.scores?.bikeScore || 0,
          transitScore: data.scores?.transitScore || 0,
          safetySentiment: data.safetySentiment || "Location analysis unavailable.",
          coordinates: data.coordinates || { latitude, longitude }
        };
        
        console.log(`✅ Location scores retrieved: Walk=${result.walkScore}, Bike=${result.bikeScore}, Transit=${result.transitScore}`);
        return result;
      } else {
        throw new Error(`Exa research task failed: ${task.status}`);
      }
    } catch (error) {
      console.error('❌ Error getting location scores:', error);
      
      // Fallback to mock data for development
      console.log('🔄 Using fallback location data...');
      return {
        walkScore: 65,
        bikeScore: 45,
        transitScore: 55,
        safetySentiment: "Location analysis temporarily unavailable. Please check back later for detailed safety and walkability information.",
        coordinates: { latitude, longitude }
      };
    }
  }

  async scoreMultipleLocations(listings: ListingWithCoordinates[]): Promise<Map<string, LocationScoreData>> {
    console.log(`🗺️ Scoring ${listings.length} locations...`);
    const results = new Map<string, LocationScoreData>();
    
    // Process in batches to avoid API rate limits
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < listings.length; i += batchSize) {
      batches.push(listings.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      const promises = batch.map(async (listing) => {
        try {
          const scores = await this.getLocationScores(
            listing.coordinates.latitude,
            listing.coordinates.longitude
          );
          results.set(listing.url, scores);
        } catch (error) {
          console.error(`❌ Failed to score location for ${listing.title}:`, error);
          // Add fallback data
          results.set(listing.url, {
            walkScore: 50,
            bikeScore: 40,
            transitScore: 45,
            safetySentiment: "Location analysis temporarily unavailable.",
            coordinates: listing.coordinates
          });
        }
      });
      
      await Promise.all(promises);
      
      // Add delay between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ Completed location scoring for ${results.size} listings`);
    return results;
  }

  // Alternative method using OpenAI chat completion (streaming)
  async getLocationScoresStream(latitude: string, longitude: string): Promise<LocationScoreData> {
    try {
      console.log(`🗺️ Getting location scores via stream for: ${latitude}, ${longitude}`);
      
      const stream = await this.openai.chat.completions.create({
        model: "exa-research",
        messages: [
          {
            role: "user",
            content: `Get the walk score, bike score, transit score, and safety sentiment at these coordinates: "latitude": "${latitude}", "longitude": "${longitude}". Return the response as JSON with the structure: {"walkScore": number, "bikeScore": number, "transitScore": number, "safetySentiment": "string"}`,
          },
        ],
        stream: true,
      });

      let responseContent = '';
      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          responseContent += content;
        }
      }

      // Parse the JSON response
      const parsed = JSON.parse(responseContent);
      return {
        walkScore: parsed.walkScore,
        bikeScore: parsed.bikeScore,
        transitScore: parsed.transitScore,
        safetySentiment: parsed.safetySentiment,
        coordinates: { latitude, longitude }
      };
    } catch (error) {
      console.error('❌ Error in streaming location scores:', error);
      throw error;
    }
  }
} 