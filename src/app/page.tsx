'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import Map from '@/components/Map';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import PriceFilter from '@/components/PriceFilter';
import BedsFilter from '@/components/BedsFilter';
import ListingCard from '@/components/ListingCard';
import ListingDetail from '@/components/ListingDetail';
import { Listing } from '@/types/listing';

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [bedsBathsFilter, setBedsBathsFilter] = useState<{ beds: number | null; baths: number | null }>({ beds: null, baths: null });

  // Load listings data
  useEffect(() => {
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
  }, []);

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

  // Filter listings based on all criteria
  const filteredListings = listings.filter(listing => {
    // Text search filter
    const matchesSearch = searchQuery === '' || 
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchQuery.toLowerCase());

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

    return matchesSearch && matchesPrice && matchesBeds && matchesBaths;
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

  const handleRefresh = () => {
    setSearchQuery('');
    setPriceRange({ min: null, max: null });
    setBedsBathsFilter({ beds: null, baths: null });
    // Optionally reload listings
    window.location.reload();
  };

  const selectedListingData = selectedListing 
    ? listings.find(l => l.url === selectedListing) 
    : null;

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
          <h2 className="text-lg font-regular text-foreground flex-shrink-0">
            {filteredListings.length} Results
          </h2>
          
          <div className="flex-1 max-w-md">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
          
          <div className="flex items-center gap-3">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
