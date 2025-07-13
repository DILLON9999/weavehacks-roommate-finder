export interface Listing {
  url: string;
  title: string;
  price: string;
  location: string;
  description: string;
  coordinates: {
    latitude: string;
    longitude: string;
  };
  images: string[];
  details: string[];
  postedDate: string;
  attributes: {
    bedrooms?: string;
    bathrooms?: string;
    availableDate?: string;
    privateRoom?: boolean;
    housingType?: string;
    privateBath?: boolean;
    laundry?: string;
    parking?: string;
    smoking?: boolean;
  };
  // Agent system extensions
  matchScore?: number;
  explanation?: string;
  commuteAnalysis?: {
    rating: number;
    distance: string;
    duration: string;
    durationInTraffic?: string;
    recommendation: string;
  };
  locationAnalysis?: {
    walkScore: number;
    bikeScore: number;
    transitScore: number;
    safetySentiment: string;
  };
  scores?: {
    housing?: number;
    commute?: number;
    location?: number;
    combined?: number;
  };
  source?: string;
} 