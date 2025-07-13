import { NextRequest, NextResponse } from 'next/server';
import { LocationScoringAgentMCP } from '@/agents/location-scoring-agent-mcp';

let locationAgent: LocationScoringAgentMCP | null = null;

async function getLocationAgent(): Promise<LocationScoringAgentMCP> {
  if (!locationAgent) {
    locationAgent = new LocationScoringAgentMCP();
    await locationAgent.initializeMCP();
  }
  return locationAgent;
}

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude, listingTitle } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    console.log(`🗺️ Getting location scores for: ${listingTitle} at ${latitude}, ${longitude}`);

    const agent = await getLocationAgent();
    const locationData = await agent.getLocationScores(latitude, longitude);

    return NextResponse.json({
      success: true,
      locationAnalysis: {
        walkScore: locationData.walkScore,
        bikeScore: locationData.bikeScore,
        transitScore: locationData.transitScore,
        safetySentiment: locationData.safetySentiment
      }
    });

  } catch (error) {
    console.error('❌ Location scoring failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get location scores',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 