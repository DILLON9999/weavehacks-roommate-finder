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
} 