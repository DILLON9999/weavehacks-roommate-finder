'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { Listing } from '@/types/listing';
import Header from '@/components/Header';
import ListingCard from '@/components/ListingCard';
import ListingDetail from '@/components/ListingDetail';
import Map from '@/components/Map';
import PriceFilter from '@/components/PriceFilter';
import BedsFilter from '@/components/BedsFilter';

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export default function PlacesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [displayedListings, setDisplayedListings] = useState<Listing[]>([]);
  const [isAgentFiltered, setIsAgentFiltered] = useState(false);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [bedsBathsFilter, setBedsBathsFilter] = useState<{ beds: number | null; baths: number | null }>({ beds: null, baths: null });
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const router = useRouter();

  // Check authentication status
  useEffect(() => {
    const supabase = createClient();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (!session?.user) {
        router.push('/auth');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (!session?.user) {
        router.push('/auth');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // Load listings data
  useEffect(() => {
    if (user) {
      const loadListings = async () => {
        try {
          const response = await fetch('/listings.json');
          const data = await response.json();
          setAllListings(data);
          setDisplayedListings(data);
        } catch (error) {
          console.error('Failed to load listings:', error);
        } finally {
          setLoading(false);
        }
      };

      loadListings();
    }
  }, [user]);

  // Parse price from string to number
  const parsePrice = (priceStr: string): number => {
    const cleanPrice = priceStr.replace(/[^\d]/g, '');
    return parseInt(cleanPrice) || 0;
  };

  // Apply filters to listings
  useEffect(() => {
    if (!isAgentFiltered) {
      let filtered = allListings;

      // Apply price filter
      if (priceRange.min !== null || priceRange.max !== null) {
        filtered = filtered.filter(listing => {
          const price = parsePrice(listing.price);
          const minOk = priceRange.min === null || price >= priceRange.min;
          const maxOk = priceRange.max === null || price <= priceRange.max;
          return minOk && maxOk;
        });
      }

      // Apply beds/baths filter
      if (bedsBathsFilter.beds !== null || bedsBathsFilter.baths !== null) {
        filtered = filtered.filter(listing => {
          const beds = parseInt(listing.attributes.bedrooms || '0');
          const baths = parseFloat(listing.attributes.bathrooms || '0');
          const bedsOk = bedsBathsFilter.beds === null || beds >= bedsBathsFilter.beds;
          const bathsOk = bedsBathsFilter.baths === null || baths >= bedsBathsFilter.baths;
          return bedsOk && bathsOk;
        });
      }

      // Apply map bounds filter
      if (mapBounds) {
        filtered = filtered.filter(listing => {
          const lat = parseFloat(listing.coordinates.latitude);
          const lng = parseFloat(listing.coordinates.longitude);
          return lat >= mapBounds.south && lat <= mapBounds.north && 
                 lng >= mapBounds.west && lng <= mapBounds.east;
        });
      }

      setDisplayedListings(filtered);
    }
  }, [allListings, priceRange, bedsBathsFilter, mapBounds, isAgentFiltered]);

  const handleListingClick = (listing: Listing) => {
    setSelectedListing(listing.url);
    setShowDetail(true);
  };

  const handleBackToListings = () => {
    setShowDetail(false);
    setSelectedListing(null); // Clear selection to allow free map navigation
  };

  const handlePriceChange = (minPrice: number | null, maxPrice: number | null) => {
    setPriceRange({ min: minPrice, max: maxPrice });
  };

  const handleBedsBathsChange = (beds: number | null, baths: number | null) => {
    setBedsBathsFilter({ beds, baths });
  };

  const handleMapBoundsChange = (bounds: MapBounds) => {
    setMapBounds(bounds);
  };

  const handleRefresh = () => {
    setPriceRange({ min: null, max: null });
    setBedsBathsFilter({ beds: null, baths: null });
    setMapBounds(null);
    setIsAgentFiltered(false);
    setDisplayedListings(allListings);
  };

  const handleAgentListingsUpdate = (agentListings: Listing[]) => {
    setDisplayedListings(agentListings);
    setIsAgentFiltered(true);
    // Clear traditional filters when agent filtering is active
    setPriceRange({ min: null, max: null });
    setBedsBathsFilter({ beds: null, baths: null });
    setMapBounds(null);
  };

  const selectedListingData = selectedListing 
    ? displayedListings.find(l => l.url === selectedListing) 
    : null;

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render anything (redirect is handled in useEffect)
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <Header onListingsUpdate={handleAgentListingsUpdate} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg text-muted-foreground">Loading listings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header onListingsUpdate={handleAgentListingsUpdate} />
      
      {/* Filter Section */}
      <div className="bg-background border-b border-border px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground flex-shrink-0">
            {displayedListings.length} Results in Current View
            {isAgentFiltered && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                AI Filtered
              </span>
            )}
          </h2>
          
          <div className="flex items-center gap-3 ml-auto">
            <PriceFilter onPriceChange={handlePriceChange} />
            <BedsFilter onFilterChange={handleBedsBathsChange} />
          </div>
          
          {/* Refresh Button - Floated Right */}
          <div className="ml-auto">
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left Side - Map */}
        <div className="flex-1 min-h-0">
          <Map 
            listings={displayedListings} 
            selectedListing={selectedListing}
            onListingSelect={handleListingClick}
            onBoundsChange={handleMapBoundsChange}
          />
        </div>

        {/* Right Side - Listings or Detail View */}
        <div className="w-[600px] bg-card border-l border-border flex-shrink-0 flex flex-col">
          {showDetail && selectedListingData ? (
            <ListingDetail 
              listing={selectedListingData} 
              onBack={handleBackToListings} 
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4">
                {displayedListings.map((listing) => (
                  <ListingCard
                    key={listing.url}
                    listing={listing}
                    isSelected={selectedListing === listing.url}
                    onClick={() => handleListingClick(listing)}
                  />
                ))}
              </div>
              
              {displayedListings.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="text-muted-foreground text-lg mb-2">
                    No listings found in current view
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Try moving or zooming the map to see more listings
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 