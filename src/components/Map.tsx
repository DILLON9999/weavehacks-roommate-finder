'use client';

import { useRef, useEffect, useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import type { MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Listing } from '@/types/listing';

interface MapProps {
  listings: Listing[];
  selectedListing: string | null;
  onListingSelect: (url: string) => void;
}

// Demo Mapbox token - replace with your own from https://www.mapbox.com/
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoidGVzdGluZyIsImEiOiJjazJhM2dib2IwNGE5M29wOGZ2OG9ld3FyIn0.FGfgMTIrEd3dTgQ1q6f2Zw';

export default function MapComponent({ listings, selectedListing, onListingSelect }: MapProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewport, setViewport] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    zoom: 11
  });

  // Center map on selected listing
  useEffect(() => {
    if (selectedListing && mapRef.current) {
      const listing = listings.find(l => l.url === selectedListing);
      if (listing) {
        mapRef.current.flyTo({
          center: [parseFloat(listing.coordinates.longitude), parseFloat(listing.coordinates.latitude)],
          zoom: 14,
          duration: 1000
        });
      }
    }
  }, [selectedListing, listings]);

  const formatPrice = (price: string) => {
    return price.replace(/[^\d,]/g, '');
  };

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={viewport}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      onMove={(evt) => setViewport(evt.viewState)}
    >
      <NavigationControl position="top-right" />
      
      {listings.map((listing) => (
        <Marker
          key={listing.url}
          longitude={parseFloat(listing.coordinates.longitude)}
          latitude={parseFloat(listing.coordinates.latitude)}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onListingSelect(listing.url);
          }}
        >
          <div
            className={`rounded-full px-3 py-1 font-semibold text-sm shadow-lg cursor-pointer transition-all border-2 ${
              selectedListing === listing.url 
                ? 'bg-blue-600 text-white border-blue-600 scale-110' 
                : 'bg-white text-gray-900 border-white hover:scale-105 hover:shadow-xl'
            }`}
          >
            {formatPrice(listing.price)}
          </div>
        </Marker>
      ))}
    </Map>
  );
} 