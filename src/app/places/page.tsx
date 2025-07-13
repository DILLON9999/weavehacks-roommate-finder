'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { RefreshCw } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Map from '@/components/Map';
import Header from '@/components/Header';

import PriceFilter from '@/components/PriceFilter';
import BedsFilter from '@/components/BedsFilter';
import ListingCard from '@/components/ListingCard';
import ListingDetail from '@/components/ListingDetail';
import { Listing } from '@/types/listing';

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export default function PlacesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
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
          setListings(data);
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

  // Parse beds/baths from attributes
  const parseBedsOrBaths = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseInt(value.replace(/[^\d]/g, ''));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // Check if a listing is within map bounds
  const isListingInBounds = (listing: Listing, bounds: MapBounds): boolean => {
    const lat = parseFloat(listing.coordinates.latitude);
    const lng = parseFloat(listing.coordinates.longitude);
    
    return lat >= bounds.south && 
           lat <= bounds.north && 
           lng >= bounds.west && 
           lng <= bounds.east;
  };

  // Filter listings based on all criteria including map bounds
  const filteredListings = listings.filter(listing => {
    // Price filter
    const listingPrice = parsePrice(listing.price);
    const matchesPrice = (priceRange.min === null || listingPrice >= priceRange.min) &&
                        (priceRange.max === null || listingPrice <= priceRange.max);

    // Beds filter
    const listingBeds = parseBedsOrBaths(listing.attributes.bedrooms);
    const matchesBeds = bedsBathsFilter.beds === null || 
                       (bedsBathsFilter.beds === 0 && listingBeds === 0) ||
                       (bedsBathsFilter.beds === 4 && listingBeds >= 4) ||
                       listingBeds === bedsBathsFilter.beds;

    // Baths filter
    const listingBaths = parseBedsOrBaths(listing.attributes.bathrooms);
    const matchesBaths = bedsBathsFilter.baths === null || listingBaths >= bedsBathsFilter.baths;

    // Map bounds filter - only show listings within the current map view
    const matchesBounds = mapBounds === null || isListingInBounds(listing, mapBounds);

    return matchesPrice && matchesBeds && matchesBaths && matchesBounds;
  });

  const handleListingClick = (url: string) => {
    setSelectedListing(url);
    setShowDetail(true);
  };

  const handleBackToListings = () => {
    setShowDetail(false);
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
    // Reset map bounds filter
    setMapBounds(null);
    // Optionally reload listings
    window.location.reload();
  };

  const selectedListingData = selectedListing 
    ? listings.find(l => l.url === selectedListing) 
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
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg text-muted-foreground">Loading listings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      
      {/* Filter Section */}
      <div className="bg-background border-b border-border px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground flex-shrink-0">
            {filteredListings.length} Results in Current View
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
            listings={filteredListings} 
            selectedListing={selectedListing}
            onListingSelect={setSelectedListing}
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
                {filteredListings.map((listing) => (
                  <ListingCard
                    key={listing.url}
                    listing={listing}
                    isSelected={selectedListing === listing.url}
                    onClick={() => handleListingClick(listing.url)}
                  />
                ))}
              </div>
              
              {filteredListings.length === 0 && (
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