'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, MapPin, Calendar, Home, Bath, Car, Shirt, Ban, Users } from 'lucide-react';
import { Listing } from '@/types/listing';
import ImageLightbox from './ImageLightbox';

interface ListingDetailProps {
  listing: Listing;
  onBack: () => void;
}

export default function ListingDetail({ listing, onBack }: ListingDetailProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllImages, setShowAllImages] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getAttributeIcon = (key: string) => {
    switch (key) {
      case 'bedrooms':
      case 'bathrooms':
        return <Bath className="w-4 h-4" />;
      case 'housingType':
        return <Home className="w-4 h-4" />;
      case 'parking':
        return <Car className="w-4 h-4" />;
      case 'laundry':
        return <Shirt className="w-4 h-4" />;
      case 'smoking':
        return <Ban className="w-4 h-4" />;
      case 'privateRoom':
        return <Users className="w-4 h-4" />;
      default:
        return <Home className="w-4 h-4" />;
    }
  };

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const handleShowMoreImages = () => {
    setShowAllImages(true);
  };

  const visibleImages = showAllImages ? listing.images : listing.images?.slice(0, 6);
  const remainingCount = listing.images ? listing.images.length - 6 : 0;

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-6 border-b border-border flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to listings
        </button>
        <h1 className="text-2xl font-semibold text-foreground mb-2">{listing.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{listing.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>Posted {formatDate(listing.postedDate)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Price */}
        <div className="mb-6">
          <div className="text-3xl font-bold text-blue-500">{listing.price}/month</div>
        </div>

        {/* Images */}
        {listing.images && listing.images.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-foreground">Photos</h3>
            <div className="grid grid-cols-2 gap-3">
              {visibleImages?.map((image, index) => (
                <div 
                  key={index} 
                  className="relative h-32 rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => handleImageClick(index)}
                >
                  <Image
                    src={image}
                    alt={`${listing.title} - Photo ${index + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-sm font-medium">
                      Click to enlarge
                    </div>
                  </div>
                </div>
              ))}
              {!showAllImages && remainingCount > 0 && (
                <div 
                  className="relative h-32 rounded-lg overflow-hidden bg-muted flex items-center justify-center cursor-pointer hover:bg-accent transition-colors"
                  onClick={handleShowMoreImages}
                >
                  <span className="text-foreground font-medium">
                    +{remainingCount} more
                  </span>
                </div>
              )}
            </div>
            
            {showAllImages && remainingCount > 0 && (
              <button
                onClick={() => setShowAllImages(false)}
                className="mt-3 text-sm text-blue-500 hover:text-blue-400 transition-colors"
              >
                Show less
              </button>
            )}
          </div>
        )}

        {/* Attributes */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-foreground">Details</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(listing.attributes).map(([key, value]) => {
              if (!value) return null;
              return (
                <div key={key} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  {getAttributeIcon(key)}
                  <div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-foreground">Description</h3>
          <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
            {listing.description}
          </div>
        </div>

        {/* Details List */}
        {listing.details && listing.details.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-foreground">Features</h3>
            <div className="grid grid-cols-1 gap-2">
              {listing.details.map((detail, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Link */}
        <div className="mb-6">
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            View Original Listing
          </a>
        </div>
      </div>

      {/* Image Lightbox */}
      {listing.images && (
        <ImageLightbox
          images={listing.images}
          currentIndex={currentImageIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setCurrentImageIndex}
        />
      )}
    </div>
  );
} 