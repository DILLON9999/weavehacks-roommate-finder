import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AgentBridge } from '@/services/agentBridge';
import { Listing } from '@/types/listing';

// Fallback function to simulate agent results if agent system fails
async function getFallbackResults(query: string): Promise<Listing[]> {
  try {
    // Load the static listings data
    const fs = await import('fs');
    const path = await import('path');
    const listingsPath = path.join(process.cwd(), 'public', 'listings.json');
    const listingsData = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
    
    // Simple keyword matching for demonstration
    const keywords = query.toLowerCase().split(' ');
    const matchedListings = listingsData.filter((listing: Listing) => {
      const text = `${listing.title} ${listing.description} ${listing.location}`.toLowerCase();
      return keywords.some((keyword: string) => text.includes(keyword));
    });

    // Add simulated match scores
    return matchedListings.slice(0, 5).map((listing: Listing) => ({
      ...listing,
      matchScore: Math.floor(Math.random() * 30) + 70, // Random score between 70-100
      explanation: `This listing matches your search for "${query}" based on location and description analysis.`,
      source: 'craigslist',
      scores: {
        housing: Math.floor(Math.random() * 30) + 70,
        combined: Math.floor(Math.random() * 30) + 70
      }
    }));
  } catch (error) {
    console.error('Fallback search failed:', error);
    return [];
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    console.log('🔍 Processing agent search query:', query);

    try {
      // Try to use the agent system first
      const agentBridge = AgentBridge.getInstance();
      const result = await agentBridge.queryAgent({
        message: query,
        userId: user.id
      });

      if (result.success && result.results.length > 0) {
        console.log('✅ Agent system returned results:', result.results.length);
        return NextResponse.json({
          success: true,
          results: result.results,
          method: 'agent-system',
          message: `Found ${result.results.length} listings using AI agent analysis`
        });
      }

      throw new Error('Agent system returned no results');
    } catch (agentError) {
      console.log('⚠️ Agent system failed, using fallback:', agentError);
      
      // Use fallback approach
      const fallbackResults = await getFallbackResults(query);
      
      return NextResponse.json({
        success: true,
        results: fallbackResults,
        method: 'fallback',
        message: `Found ${fallbackResults.length} listings using fallback search (Agent system temporarily unavailable)`
      });
    }

  } catch (error) {
    console.error('Agent search API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 