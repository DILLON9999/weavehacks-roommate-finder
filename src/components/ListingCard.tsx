'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MapPin, Sparkles, MapIcon, Loader2 } from 'lucide-react';
import { Listing } from '@/types/listing';

interface LocationAnalysis {
  walkScore: number;
  bikeScore: number;
  transitScore: number;
  safetySentiment: string;
}

interface ListingCardProps {
  listing: Listing;
  isSelected: boolean;
  onClick: () => void;
  onLocationUpdate?: (listingUrl: string, locationAnalysis: LocationAnalysis) => void;
}

export default function ListingCard({ listing, isSelected, onClick, onLocationUpdate }: ListingCardProps) {
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const getFirstImage = () => {
    return listing.images && listing.images.length > 0 
      ? listing.images[0] 
      : 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=300&fit=crop';
  };

  // Parse and format bedroom/bathroom data
  const formatBedrooms = (bedrooms?: string) => {
    if (!bedrooms) return null;
    const num = parseInt(bedrooms) || 0;
    if (num === 0) return 'Studio';
    return `${num} Bed${num > 1 ? 's' : ''}`;
  };

  const formatBathrooms = (bathrooms?: string) => {
    if (!bathrooms) return null;
    const num = parseFloat(bathrooms) || 0;
    if (num === 0) return null;
    return `${num} Bath${num > 1 ? 's' : ''}`;
  };

  const bedroomLabel = formatBedrooms(listing.attributes.bedrooms);
  const bathroomLabel = formatBathrooms(listing.attributes.bathrooms);

  // Get match score color based on percentage
  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'from-green-500 to-green-600';
    if (score >= 80) return 'from-blue-500 to-blue-600';
    if (score >= 70) return 'from-yellow-500 to-yellow-600';
    if (score >= 60) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  const handleGetLocationScore = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (!listing.coordinates?.latitude || !listing.coordinates?.longitude) {
      setLocationError('No coordinates available for this listing');
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);

    try {
      const response = await fetch('/api/location-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: listing.coordinates.latitude,
          longitude: listing.coordinates.longitude,
          listingTitle: listing.title,
        }),
      });

      const data = await response.json();

      if (data.success && onLocationUpdate) {
        onLocationUpdate(listing.url, data.locationAnalysis);
      } else {
        setLocationError(data.error || 'Failed to get location scores');
      }
    } catch (error) {
      setLocationError('Network error - please try again');
      console.error('Location scoring error:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  return (
    <div
      className={`cursor-pointer rounded-2xl overflow-hidden transition-all bg-card border border-border shadow-sm hover:shadow-md hover:border-ring ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      {/* Image with overlays */}
      <div className="relative h-40 w-full">
        <Image
          src={getFirstImage()}
          alt={listing.title}
          fill
          className="object-cover"
        />
        
        {/* Match Score Badge - Top Left */}
        {listing.matchScore && (
          <div className={`absolute top-3 left-3 bg-gradient-to-r ${getMatchScoreColor(listing.matchScore)} text-white rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1 shadow-lg`}>
            <Sparkles className="w-3 h-3" />
            {Math.round(listing.matchScore)}% Match
          </div>
        )}
        
        {/* Source Badge - Top Right */}
        {listing.source && (
          <div className="absolute top-3 right-3 bg-black bg-opacity-70 text-white rounded-full px-2 py-1 text-xs font-medium">
            {listing.source === 'craigslist' ? '🔵 Craigslist' : listing.source === 'facebook' ? '🔴 Facebook' : '⚪ ' + listing.source}
          </div>
        )}
        
        {/* Bedroom and Bathroom labels */}
        <div className="absolute bottom-3 left-3 flex gap-2">
          {bedroomLabel && (
            <div className="bg-blue-900 bg-opacity-70 text-blue-100 rounded-full px-2 py-1 text-xs font-medium">
              {bedroomLabel}
            </div>
          )}
          {bathroomLabel && (
            <div className="bg-blue-500 bg-opacity-70 text-blue-100 rounded-full px-2 py-1 text-xs font-medium">
              {bathroomLabel}
            </div>
          )}
        </div>
        
        {/* Price label */}
        <div className="absolute bottom-3 right-3 bg-black bg-opacity-70 text-white rounded-full px-3 py-1 font-semibold text-sm">
          {listing.price}
        </div>
      </div>
      
      {/* Address section */}
      <div className="p-4">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-sm text-muted-foreground leading-tight">{listing.location}</span>
        </div>
        
        {/* Agent scores breakdown */}
        {listing.scores && (
          <div className="mt-2 flex gap-2 text-xs">
            {listing.scores.housing && (
              <div className="text-blue-400">
                🏠 {listing.scores.housing}%
              </div>
            )}
            {listing.scores.commute && (
              <div className="text-green-400">
                🚗 {listing.scores.commute}%
              </div>
            )}
            {listing.scores.location && (
              <div className="text-purple-400">
                📍 {listing.scores.location}%
              </div>
            )}
          </div>
        )}

        {/* Location Analysis or Get Location Score Button */}
        {listing.locationAnalysis ? (
          <div className="mt-2 p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <MapIcon className="w-3 h-3 text-purple-500" />
              <span className="text-xs font-medium text-gray-700">Location Scores</span>
            </div>
            <div className="flex gap-3 text-xs text-gray-600">
              <span>🚶 {listing.locationAnalysis.walkScore}</span>
              <span>🚴 {listing.locationAnalysis.bikeScore}</span>
              <span>🚇 {listing.locationAnalysis.transitScore}</span>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <button
              onClick={handleGetLocationScore}
              disabled={isLoadingLocation}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingLocation ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Getting Location Scores...
                </>
              ) : (
                <>
                  <MapIcon className="w-3 h-3" />
                  Get Location Score
                </>
              )}
            </button>
            {locationError && (
              <div className="mt-1 text-xs text-red-500 text-center">
                {locationError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 