import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Initialize the ApifyClient with API token
const client = new ApifyClient({
    token: process.env.APIFY_API_KEY,
});

// Prepare Actor input
const input = {
    "urls": [
        "https://www.facebook.com/marketplace/sanfrancisco/search/?query=roommate"
    ],
    "fetch_item_details": true,
    "deduplicate_across_runs": false,
    "stop_on_first_page_all_duplicates": false,
    "proxy": {
        "useApifyProxy": true,
        "apifyProxyGroups": [
            "RESIDENTIAL"
        ],
        "apifyProxyCountry": "US"
    },
    "max_items": 50
};

// Function to ensure directory exists
function ensureDirectoryExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Function to extract price from formatted amount
function extractPrice(priceObj: any): number {
    if (!priceObj || !priceObj.amount) return 0;
    return parseFloat(priceObj.amount) || 0;
}

// Function to extract location from Facebook location object
function extractLocation(locationObj: any): string {
    if (!locationObj || !locationObj.reverse_geocode) return '';
    const { city, state } = locationObj.reverse_geocode;
    return city && state ? `${city}, ${state}` : '';
}

// Function to extract coordinates from Facebook location object
function extractCoordinates(locationObj: any): { latitude: number; longitude: number } | null {
    if (!locationObj || !locationObj.latitude || !locationObj.longitude) return null;
    return {
        latitude: parseFloat(locationObj.latitude),
        longitude: parseFloat(locationObj.longitude)
    };
}

// Function to extract room/bath info from unit_room_info
function parseRoomInfo(unitRoomInfo: string): { bedrooms: number; bathrooms: number } {
    if (!unitRoomInfo) return { bedrooms: 0, bathrooms: 0 };
    
    const bedroomMatch = unitRoomInfo.match(/(\d+)\s+bed/i);
    const bathroomMatch = unitRoomInfo.match(/(\d+)\s+bath/i);
    
    return {
        bedrooms: bedroomMatch ? parseInt(bedroomMatch[1]) : 0,
        bathrooms: bathroomMatch ? parseInt(bathroomMatch[1]) : 0
    };
}

// Function to extract images from Facebook listing
function extractImages(listing: any): string[] {
    const images: string[] = [];
    const seenUrls = new Set<string>(); // Prevent duplicates
    
    // Primary listing photo
    if (listing.primary_listing_photo?.image?.uri) {
        const url = listing.primary_listing_photo.image.uri;
        if (!seenUrls.has(url)) {
            images.push(url);
            seenUrls.add(url);
        }
    }
    
    // Additional photos from listing details
    if (listing.listing_details?.listing_photos && Array.isArray(listing.listing_details.listing_photos)) {
        listing.listing_details.listing_photos.forEach((photo: any) => {
            let photoUrl = null;
            
            // Facebook structure: photo.image.uri
            if (photo.image?.uri) {
                photoUrl = photo.image.uri;
            } else if (photo.listing_image?.uri) {
                photoUrl = photo.listing_image.uri;
            } else if (photo.uri) {
                photoUrl = photo.uri;
            } else if (photo.url) {
                photoUrl = photo.url;
            } else if (typeof photo === 'string') {
                photoUrl = photo;
            }
            
            // Add photo URL if found and not already seen
            if (photoUrl && !seenUrls.has(photoUrl)) {
                images.push(photoUrl);
                seenUrls.add(photoUrl);
            }
        });
    }
    
    // Also check for photos in the main listing object
    if (listing.images && Array.isArray(listing.images)) {
        listing.images.forEach((image: any) => {
            let imageUrl = null;
            
            if (typeof image === 'string') {
                imageUrl = image;
            } else if (image.uri) {
                imageUrl = image.uri;
            } else if (image.url) {
                imageUrl = image.url;
            }
            
            if (imageUrl && !seenUrls.has(imageUrl)) {
                images.push(imageUrl);
                seenUrls.add(imageUrl);
            }
        });
    }
    
    return images;
}

// Function to process Facebook data into Craigslist format
function processListings(items: any[]): { listings: any[], cleanListings: any[], images: Record<string, string[]> } {
    const listings: any[] = [];
    const cleanListings: any[] = [];
    const images: Record<string, string[]> = {};
    
    items.forEach((item) => {
        const listingId = item.id;
        const title = item.marketplace_listing_title || item.custom_title || 'Untitled';
        const price = extractPrice(item.listing_price);
        const location = extractLocation(item.location);
        const description = item.listing_details?.redacted_description?.text || '';
        const coordinates = extractCoordinates(item.listing_details?.location);
        const listingImages = extractImages(item);
        const roomInfo = parseRoomInfo(item.listing_details?.unit_room_info || '');
        
        // Raw listing format (similar to Craigslist listings.json)
        const rawListing = {
            id: listingId,
            url: `https://www.facebook.com/marketplace/item/${listingId}`,
            title: title,
            price: item.listing_price?.formatted_amount || '$0',
            location: location,
            description: description,
            coordinates: coordinates ? {
                latitude: coordinates.latitude.toString(),
                longitude: coordinates.longitude.toString()
            } : null,
            images: listingImages,
            details: [
                item.listing_details?.unit_room_info || '',
                item.listing_details?.marketplace_listing_category_name || '',
                'private room',
                item.listing_details?.formatted_price?.text || ''
            ].filter(Boolean),
            postedDate: new Date().toISOString(),
            attributes: {
                bedrooms: roomInfo.bedrooms.toString(),
                bathrooms: roomInfo.bathrooms.toString(),
                privateRoom: true,
                housingType: 'apartment',
                privateBath: roomInfo.bathrooms > 0,
                deliveryTypes: item.delivery_types || []
            }
        };
        
        // Clean listing format (similar to Craigslist clean-listings.json)
        const cleanListing = {
            id: listingId,
            url: `https://www.facebook.com/marketplace/item/${listingId}`,
            title: title,
            price: price,
            location: location,
            description: description,
            coordinates: coordinates,
            postedDate: new Date().toISOString(),
            bedrooms: roomInfo.bedrooms,
            bathrooms: roomInfo.bathrooms,
            privateRoom: true,
            housingType: 'apartment',
            privateBath: roomInfo.bathrooms > 0,
            deliveryTypes: item.delivery_types || []
        };
        
        listings.push(rawListing);
        cleanListings.push(cleanListing);
        images[listingId] = listingImages;
    });
    
    return { listings, cleanListings, images };
}

(async () => {
    try {
        console.log('Starting Facebook Marketplace scraper...');
        
        // Run the Actor and wait for it to finish
        const run = await client.actor("xjf3mCpgMbIAaIBbv").call(input);

        // Fetch and print Actor results from the run's dataset (if any)
        console.log('Fetching results from dataset...');
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        console.log(`Found ${items.length} items. Processing...`);
        
        // Process the data into the same format as CraigslistData
        const { listings, cleanListings, images } = processListings(items);
        
        // Create FacebookData directory
        const facebookDataDir = path.join(__dirname, 'FacebookData');
        ensureDirectoryExists(facebookDataDir);
        
        // Save listings.json
        const listingsPath = path.join(facebookDataDir, 'listings.json');
        fs.writeFileSync(listingsPath, JSON.stringify(listings, null, 2));
        console.log(`Saved ${listings.length} listings to ${listingsPath}`);
        
        // Save clean-listings.json
        const cleanListingsPath = path.join(facebookDataDir, 'clean-listings.json');
        fs.writeFileSync(cleanListingsPath, JSON.stringify(cleanListings, null, 2));
        console.log(`Saved ${cleanListings.length} clean listings to ${cleanListingsPath}`);
        
        // Save images.json
        const imagesPath = path.join(facebookDataDir, 'images.json');
        fs.writeFileSync(imagesPath, JSON.stringify(images, null, 2));
        console.log(`Saved image data to ${imagesPath}`);
        
        // Calculate image statistics
        const totalImages = Object.values(images).reduce((sum, imgArray) => sum + imgArray.length, 0);
        const avgImagesPerListing = totalImages / listings.length;
        
        console.log(`\nFacebook scraping completed successfully!`);
        console.log(`- Raw listings: ${listings.length}`);
        console.log(`- Clean listings: ${cleanListings.length}`);
        console.log(`- Image collections: ${Object.keys(images).length}`);
        console.log(`- Total images extracted: ${totalImages}`);
        console.log(`- Average images per listing: ${avgImagesPerListing.toFixed(1)}`);
        
    } catch (error) {
        console.error('Error during scraping:', error);
        process.exit(1);
    }
})();