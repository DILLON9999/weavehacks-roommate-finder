'use client';

import { useState, useEffect } from 'react';
import Map from '@/components/Map';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import ListingCard from '@/components/ListingCard';
import ListingDetail from '@/components/ListingDetail';
import { Listing } from '@/types/listing';

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Filter listings based on search query
  const filteredListings = listings.filter(listing => 
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleListingClick = (url: string) => {
    setSelectedListing(url);
    setShowDetail(true);
  };

  const handleBackToListings = () => {
    setShowDetail(false);
  };

  const selectedListingData = selectedListing 
    ? listings.find(l => l.url === selectedListing) 
    : null;

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg text-gray-600">Loading listings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <Header />
      
      <div className="flex flex-1 min-h-0">
        {/* Left Side - Map with Search Above */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search Section Above Map - Horizontal Layout */}
          <div className="bg-white p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-6">
              <h2 className="text-2xl font-semibold text-gray-900 flex-shrink-0">
                {filteredListings.length} Results
              </h2>
              <div className="flex-1 max-w-md">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>
            </div>
          </div>
          
          {/* Map - Takes remaining space */}
          <div className="flex-1 min-h-0">
            <Map 
              listings={filteredListings} 
              selectedListing={selectedListing}
              onListingSelect={setSelectedListing}
            />
          </div>
        </div>

        {/* Right Side - Listings or Detail View */}
        <div className="w-[600px] bg-gray-50 flex-shrink-0">
          {showDetail && selectedListingData ? (
            <ListingDetail 
              listing={selectedListingData} 
              onBack={handleBackToListings} 
            />
          ) : (
            <div className="overflow-y-auto p-6">
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
