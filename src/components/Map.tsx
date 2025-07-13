'use client';

import { useRef, useEffect, useState } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl } from 'react-map-gl';
import type { MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Listing } from '@/types/listing';

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MapProps {
  listings: Listing[];
  selectedListing: string | null;
  onListingSelect: (listing: Listing) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
}

// Demo Mapbox token - replace with your own from https://www.mapbox.com/
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoidGVzdGluZyIsImEiOiJjazJhM2dib2IwNGE5M29wOGZ2OG9ld3FyIn0.FGfgMTIrEd3dTgQ1q6f2Zw';

export default function MapComponent({ listings, selectedListing, onListingSelect, onBoundsChange }: MapProps) {
  const mapRef = useRef<MapRef>(null);
  const geolocateControlRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const [viewport, setViewport] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    zoom: 11
  });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  // Request location permission and get user location on component mount
  useEffect(() => {
    const getUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ latitude, longitude });
            
            // Center map on user location
            if (mapRef.current) {
              mapRef.current.flyTo({
                center: [longitude, latitude],
                zoom: 12,
                duration: 1500
              });
            }
          },
          (error) => {
            console.log('Location permission denied or unavailable:', error);
            // Fallback to San Francisco
            setViewport({
              latitude: 37.7749,
              longitude: -122.4194,
              zoom: 11
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 600000 // 10 minutes
          }
        );
      }
    };

    getUserLocation();
  }, []);

  // Center map on selected listing (only if user is not manually interacting)
  useEffect(() => {
    if (selectedListing && mapRef.current && !isUserInteracting) {
      const listing = listings.find(l => l.url === selectedListing);
      if (listing) {
        mapRef.current.flyTo({
          center: [parseFloat(listing.coordinates.longitude), parseFloat(listing.coordinates.latitude)],
          zoom: 14,
          duration: 300
        });
      }
    }
  }, [selectedListing, listings, isUserInteracting]);

  // Send initial bounds when map loads
  useEffect(() => {
    if (onBoundsChange && mapRef.current) {
      const timer = setTimeout(() => {
        const bounds = mapRef.current?.getBounds();
        if (bounds) {
          onBoundsChange({
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
          });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [onBoundsChange]);

  const formatPrice = (price: string) => {
    return price.replace(/[^\d,]/g, '');
  };

  // Calculate and send map bounds when map moves
  const handleMapMove = (evt: { viewState: { latitude: number; longitude: number; zoom: number } }) => {
    setViewport(evt.viewState);
    
    if (onBoundsChange && mapRef.current) {
      const bounds = mapRef.current.getBounds();
      if (bounds) {
        onBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        });
      }
    }
  };

  // Handle user interaction start (dragging, zooming, etc.)
  const handleMoveStart = () => {
    setIsUserInteracting(true);
  };

  // Handle user interaction end
  const handleMoveEnd = () => {
    // Add a small delay before allowing auto-centering again
    setTimeout(() => {
      setIsUserInteracting(false);
    }, 500);
  };

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={viewport}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      onMove={handleMapMove}
      onMoveStart={handleMoveStart}
      onMoveEnd={handleMoveEnd}
    >
      <NavigationControl position="bottom-right" />
      
      <GeolocateControl
        ref={geolocateControlRef}
        position="bottom-right"
        positionOptions={{
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 600000
        }}
        trackUserLocation={true}
        showUserHeading={true}
        showAccuracyCircle={true}
        style={{
          marginBottom: '60px' // Position above navigation control
        }}
      />

      {/* Custom blue dot for user location */}
      {userLocation && (
        <Marker
          longitude={userLocation.longitude}
          latitude={userLocation.latitude}
          anchor="center"
        >
          <div className="relative">
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
            <div className="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full opacity-30 animate-pulse"></div>
          </div>
        </Marker>
      )}
      
      {listings.map((listing) => (
        <Marker
          key={listing.url}
          longitude={parseFloat(listing.coordinates.longitude)}
          latitude={parseFloat(listing.coordinates.latitude)}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onListingSelect(listing);
          }}
        >
          <div
            className={`rounded-full px-3 py-1 font-semibold text-sm shadow-lg cursor-pointer transition-all border-2 ${
              selectedListing === listing.url 
                ? 'bg-blue-600 text-white border-blue-600 scale-110' 
                : 'bg-card text-foreground border-border hover:scale-105 hover:shadow-xl'
            }`}
          >
            {formatPrice(listing.price)}
          </div>
        </Marker>
      ))}
    </Map>
  );
} 