import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync, readFileSync, existsSync } from 'fs';

interface ListingDetails {
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

interface CleanListing {
  id: string;
  url: string;
  title: string;
  price: number;
  location: string;
  description: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  postedDate: string;
  bedrooms: number;
  bathrooms: number;
  availableDate: string;
  privateRoom: boolean;
  housingType: string;
  privateBath: boolean;
  laundry: string;
  parking: string;
  smoking: boolean;
}

interface ImageMap {
  [listingId: string]: string[];
}

const CACHE_FILE = 'CraigslistData/listings.json';

function generateId(url: string): string {
  // Extract the listing ID from the URL
  const match = url.match(/\/(\d+)\.html$/);
  return match ? match[1] : url.split('/').pop()?.replace('.html', '') || Math.random().toString(36);
}

function parsePrice(priceString: string): number {
  const match = priceString.match(/\$?([\d,]+)/);
  return match ? parseInt(match[1].replace(/,/g, '')) : 0;
}

function parseCoordinate(coord: string): number {
  const num = parseFloat(coord);
  return isNaN(num) ? 0 : num;
}

function processListings(rawListings: ListingDetails[]): void {
  console.log('\n📋 Processing listings...');
  
  const cleanListings: CleanListing[] = [];
  const imageMap: ImageMap = {};
  
  for (const raw of rawListings) {
    const id = generateId(raw.url);
    
    // Store images separately
    if (raw.images && raw.images.length > 0) {
      imageMap[id] = raw.images;
    }
    
    // Create clean listing
    const clean: CleanListing = {
      id,
      url: raw.url,
      title: raw.title || '',
      price: parsePrice(raw.price),
      location: raw.location || '',
      description: raw.description || '',
      coordinates: {
        latitude: parseCoordinate(raw.coordinates?.latitude || '0'),
        longitude: parseCoordinate(raw.coordinates?.longitude || '0')
      },
      postedDate: raw.postedDate || '',
      bedrooms: parseInt(raw.attributes?.bedrooms || '0'),
      bathrooms: parseInt(raw.attributes?.bathrooms || '0'),
      availableDate: raw.attributes?.availableDate || '',
      privateRoom: raw.attributes?.privateRoom || false,
      housingType: raw.attributes?.housingType || 'unknown',
      privateBath: raw.attributes?.privateBath || false,
      laundry: raw.attributes?.laundry || '',
      parking: raw.attributes?.parking || '',
      smoking: raw.attributes?.smoking || false
    };
    
    cleanListings.push(clean);
  }
  
  // Save processed data
  writeFileSync('CraigslistData/clean-listings.json', JSON.stringify(cleanListings, null, 2));
  writeFileSync('CraigslistData/images.json', JSON.stringify(imageMap, null, 2));
  
  console.log(`✅ Processed ${cleanListings.length} listings`);
  console.log(`📸 Saved ${Object.keys(imageMap).length} image mappings`);
  console.log('📁 Created: CraigslistData/clean-listings.json, CraigslistData/images.json');
  
  // Show summary
  const priceRange = cleanListings
    .map(l => l.price)
    .filter(p => p > 0);
  
  if (priceRange.length > 0) {
    const minPrice = Math.min(...priceRange);
    const maxPrice = Math.max(...priceRange);
    const avgPrice = Math.round(priceRange.reduce((a, b) => a + b, 0) / priceRange.length);
    
    console.log(`💰 Price range: $${minPrice} - $${maxPrice} (avg: $${avgPrice})`);
  }
  
  const housingTypes = cleanListings.reduce((acc, l) => {
    acc[l.housingType] = (acc[l.housingType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('🏠 Housing types:', Object.entries(housingTypes).map(([type, count]) => `${type}: ${count}`).join(', '));
}

async function scrapeListings(count: number): Promise<ListingDetails[]> {

    console.log('starting')
  // Load existing cache
  let cachedListings: ListingDetails[] = [];
  if (existsSync(CACHE_FILE)) {
    try {
      const data = readFileSync(CACHE_FILE, 'utf8');
      cachedListings = JSON.parse(data);
      console.log(`📂 Loaded ${cachedListings.length} existing listings`);
    } catch (error) {
      console.log('🆕 Starting fresh - no existing cache');
    }
  }

  try {
    console.log('🔍 Getting listing URLs...');
    
    // Get all listing URLs
    const listingsUrl = 'https://sfbay.craigslist.org/search/roo?query=looking%20for%20a%20roommate#search=2~gallery~0';
    const response = await axios.get(listingsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const urls: string[] = [];
    
    $('ol.cl-static-search-results li.cl-static-search-result').each((_index: number, element: any) => {
      const $element = $(element);
      const linkElement = $element.find('a');
      
      if (linkElement.length > 0) {
        const href = linkElement.attr('href');
        if (href) {
          const fullUrl = href.startsWith('http') ? href : `https://sfbay.craigslist.org${href}`;
          urls.push(fullUrl);
        }
      }
    });

    console.log(`📋 Found ${urls.length} total listings, will scrape first ${count}`);

    // Scrape the first N listings
    const urlsToScrape = urls.slice(0, count);
    let scraped = 0;
    let skipped = 0;

    for (let i = 0; i < urlsToScrape.length; i++) {
      const url = urlsToScrape[i];
      const progress = `[${i + 1}/${urlsToScrape.length}]`;
      
      // Check if already cached
      const existing = cachedListings.find(l => l.url === url);
      if (existing) {
        console.log(`${progress} ⏭️  Already cached: ${existing.title}`);
        skipped++;
        continue;
      }

      try {
        console.log(`${progress} 🔄 Scraping: ${url}`);
        
        // Scrape individual listing details
        const detailResponse = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 30000
        });

        const detail$ = cheerio.load(detailResponse.data);
        
        // Extract all the details
        const fullTitle = detail$('h1.postingtitle .postingtitletext').text().trim();
        const priceMatch = fullTitle.match(/\$[\d,]+/);
        const price = priceMatch ? priceMatch[0] : '';
        
        const titleText = detail$('#titletextonly').text().trim();
        const locationMatch = fullTitle.match(/\(([^)]+)\)$/);
        const location = locationMatch ? locationMatch[1] : '';

        const descriptionElement = detail$('#postingbody');
        descriptionElement.find('.print-information').remove();
        const description = descriptionElement.text().trim();

        const mapDiv = detail$('#map');
        const latitude = mapDiv.attr('data-latitude') || '';
        const longitude = mapDiv.attr('data-longitude') || '';

        const images: string[] = [];
        detail$('.thumb').each((_index: number, element: any) => {
          const href = detail$(element).attr('href');
          if (href) {
            images.push(href);
          }
        });

        const details: string[] = [];
        const attributes: ListingDetails['attributes'] = {};
        
        const brBaText = detail$('.attr.important').first().text().trim();
        if (brBaText) {
          details.push(brBaText);
          const brMatch = brBaText.match(/(\d+)BR/);
          const baMatch = brBaText.match(/(\d+)Ba/);
          if (brMatch) attributes.bedrooms = brMatch[1];
          if (baMatch) attributes.bathrooms = baMatch[1];
        }

        const availableDateElement = detail$('.attr.important').eq(1);
        if (availableDateElement.length) {
          const availableText = availableDateElement.text().trim();
          details.push(availableText);
          attributes.availableDate = availableText;
        }

        detail$('.attrgroup .attr').each((_index: number, element: any) => {
          const $element = detail$(element);
          const text = $element.text().trim();
          if (text) {
            details.push(text);
            
            if (text.includes('private room')) {
              attributes.privateRoom = true;
            } else if (text.includes('house')) {
              attributes.housingType = 'house';
            } else if (text.includes('apartment')) {
              attributes.housingType = 'apartment';
            } else if (text.includes('condo')) {
              attributes.housingType = 'condo';
            } else if (text.includes('no private bath')) {
              attributes.privateBath = false;
            } else if (text.includes('private bath')) {
              attributes.privateBath = true;
            } else if (text.includes('w/d in unit')) {
              attributes.laundry = 'w/d in unit';
            } else if (text.includes('w/d hookups')) {
              attributes.laundry = 'w/d hookups';
            } else if (text.includes('laundry on site')) {
              attributes.laundry = 'laundry on site';
            } else if (text.includes('off-street parking')) {
              attributes.parking = 'off-street parking';
            } else if (text.includes('street parking')) {
              attributes.parking = 'street parking';
            } else if (text.includes('no parking')) {
              attributes.parking = 'no parking';
            } else if (text.includes('no smoking')) {
              attributes.smoking = false;
            } else if (text.includes('smoking ok')) {
              attributes.smoking = true;
            }
          }
        });

        const postedDateElement = detail$('.postinginfo .date.timeago');
        const postedDate = postedDateElement.attr('datetime') || postedDateElement.text().trim() || '';

        const listing: ListingDetails = {
          url,
          title: titleText,
          price,
          location,
          description,
          coordinates: { latitude, longitude },
          images,
          details,
          postedDate,
          attributes
        };

        cachedListings.push(listing);
        scraped++;
        
        console.log(`${progress} ✅ ${listing.title} - ${listing.price}`);
        
        // Save progress every 5 listings
        if (scraped % 5 === 0) {
          writeFileSync(CACHE_FILE, JSON.stringify(cachedListings, null, 2));
          console.log(`💾 Saved progress (${cachedListings.length} total)`);
        }
        
        // Be respectful - wait between requests
        if (i < urlsToScrape.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.log(`${progress} ❌ Error: ${error}`);
      }
    }

    // Final save
    writeFileSync(CACHE_FILE, JSON.stringify(cachedListings, null, 2));
    
    console.log(`\n🎉 Complete! Scraped ${scraped} new, skipped ${skipped} cached`);
    console.log(`📊 Total listings: ${cachedListings.length}`);
    
    // Automatically process the listings
    processListings(cachedListings);
    
    return cachedListings;

  } catch (error) {
    console.error('❌ Scraping failed:', error);
    throw error;
  }
}

// Export the function and interfaces
export { scrapeListings, ListingDetails, CleanListing, ImageMap };

// CLI usage
if (process.argv.length > 2) {
  console.log('Starting scraper...');
  const count = parseInt(process.argv[2]) || 10;
  scrapeListings(count).catch(console.error);
} 