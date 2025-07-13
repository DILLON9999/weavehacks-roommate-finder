"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeListings = scrapeListings;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const fs_1 = require("fs");
const CACHE_FILE = 'CraigslistData/listings.json';
function generateId(url) {
    // Extract the listing ID from the URL
    const match = url.match(/\/(\d+)\.html$/);
    return match ? match[1] : url.split('/').pop()?.replace('.html', '') || Math.random().toString(36);
}
function parsePrice(priceString) {
    const match = priceString.match(/\$?([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, '')) : 0;
}
function parseCoordinate(coord) {
    const num = parseFloat(coord);
    return isNaN(num) ? 0 : num;
}
function processListings(rawListings) {
    console.log('\n📋 Processing listings...');
    const cleanListings = [];
    const imageMap = {};
    for (const raw of rawListings) {
        const id = generateId(raw.url);
        // Store images separately
        if (raw.images && raw.images.length > 0) {
            imageMap[id] = raw.images;
        }
        // Create clean listing
        const clean = {
            id,
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
    (0, fs_1.writeFileSync)('CraigslistData/clean-listings.json', JSON.stringify(cleanListings, null, 2));
    (0, fs_1.writeFileSync)('CraigslistData/images.json', JSON.stringify(imageMap, null, 2));
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
    }, {});
    console.log('🏠 Housing types:', Object.entries(housingTypes).map(([type, count]) => `${type}: ${count}`).join(', '));
}
async function scrapeListings(count) {
    console.log('starting');
    // Load existing cache
    let cachedListings = [];
    if ((0, fs_1.existsSync)(CACHE_FILE)) {
        try {
            const data = (0, fs_1.readFileSync)(CACHE_FILE, 'utf8');
            cachedListings = JSON.parse(data);
            console.log(`📂 Loaded ${cachedListings.length} existing listings`);
        }
        catch (error) {
            console.log('🆕 Starting fresh - no existing cache');
        }
    }
    try {
        console.log('🔍 Getting listing URLs...');
        // Get all listing URLs
        const listingsUrl = 'https://sfbay.craigslist.org/search/roo?query=looking%20for%20a%20roommate#search=2~gallery~0';
        const response = await axios_1.default.get(listingsUrl, {
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
        const urls = [];
        $('ol.cl-static-search-results li.cl-static-search-result').each((_index, element) => {
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
                const detailResponse = await axios_1.default.get(url, {
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
                const images = [];
                detail$('.thumb').each((_index, element) => {
                    const href = detail$(element).attr('href');
                    if (href) {
                        images.push(href);
                    }
                });
                const details = [];
                const attributes = {};
                const brBaText = detail$('.attr.important').first().text().trim();
                if (brBaText) {
                    details.push(brBaText);
                    const brMatch = brBaText.match(/(\d+)BR/);
                    const baMatch = brBaText.match(/(\d+)Ba/);
                    if (brMatch)
                        attributes.bedrooms = brMatch[1];
                    if (baMatch)
                        attributes.bathrooms = baMatch[1];
                }
                const availableDateElement = detail$('.attr.important').eq(1);
                if (availableDateElement.length) {
                    const availableText = availableDateElement.text().trim();
                    details.push(availableText);
                    attributes.availableDate = availableText;
                }
                detail$('.attrgroup .attr').each((_index, element) => {
                    const $element = detail$(element);
                    const text = $element.text().trim();
                    if (text) {
                        details.push(text);
                        if (text.includes('private room')) {
                            attributes.privateRoom = true;
                        }
                        else if (text.includes('house')) {
                            attributes.housingType = 'house';
                        }
                        else if (text.includes('apartment')) {
                            attributes.housingType = 'apartment';
                        }
                        else if (text.includes('condo')) {
                            attributes.housingType = 'condo';
                        }
                        else if (text.includes('no private bath')) {
                            attributes.privateBath = false;
                        }
                        else if (text.includes('private bath')) {
                            attributes.privateBath = true;
                        }
                        else if (text.includes('w/d in unit')) {
                            attributes.laundry = 'w/d in unit';
                        }
                        else if (text.includes('w/d hookups')) {
                            attributes.laundry = 'w/d hookups';
                        }
                        else if (text.includes('laundry on site')) {
                            attributes.laundry = 'laundry on site';
                        }
                        else if (text.includes('off-street parking')) {
                            attributes.parking = 'off-street parking';
                        }
                        else if (text.includes('street parking')) {
                            attributes.parking = 'street parking';
                        }
                        else if (text.includes('no parking')) {
                            attributes.parking = 'no parking';
                        }
                        else if (text.includes('no smoking')) {
                            attributes.smoking = false;
                        }
                        else if (text.includes('smoking ok')) {
                            attributes.smoking = true;
                        }
                    }
                });
                const postedDateElement = detail$('.postinginfo .date.timeago');
                const postedDate = postedDateElement.attr('datetime') || postedDateElement.text().trim() || '';
                const listing = {
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
                    (0, fs_1.writeFileSync)(CACHE_FILE, JSON.stringify(cachedListings, null, 2));
                    console.log(`💾 Saved progress (${cachedListings.length} total)`);
                }
                // Be respectful - wait between requests
                if (i < urlsToScrape.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            catch (error) {
                console.log(`${progress} ❌ Error: ${error}`);
            }
        }
        // Final save
        (0, fs_1.writeFileSync)(CACHE_FILE, JSON.stringify(cachedListings, null, 2));
        console.log(`\n🎉 Complete! Scraped ${scraped} new, skipped ${skipped} cached`);
        console.log(`📊 Total listings: ${cachedListings.length}`);
        // Automatically process the listings
        processListings(cachedListings);
        return cachedListings;
    }
    catch (error) {
        console.error('❌ Scraping failed:', error);
        throw error;
    }
}
// CLI usage
if (process.argv.length > 2) {
    console.log('Starting scraper...');
    const count = parseInt(process.argv[2]) || 10;
    scrapeListings(count).catch(console.error);
}
