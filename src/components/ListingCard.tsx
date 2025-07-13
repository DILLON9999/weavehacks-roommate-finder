'use client';

import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { Listing } from '@/types/listing';

interface ListingCardProps {
  listing: Listing;
  isSelected: boolean;
  onClick: () => void;
}

export default function ListingCard({ listing, isSelected, onClick }: ListingCardProps) {
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
      </div>
    </div>
  );
} 