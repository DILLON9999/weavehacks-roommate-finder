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

  return (
    <div
      className={`cursor-pointer rounded-2xl overflow-hidden transition-all bg-card border border-border shadow-sm hover:shadow-md hover:border-ring ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      {/* Image with price overlay */}
      <div className="relative h-40 w-full">
        <Image
          src={getFirstImage()}
          alt={listing.title}
          fill
          className="object-cover"
        />
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