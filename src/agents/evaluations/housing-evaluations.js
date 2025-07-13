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
Object.defineProperty(exports, "__esModule", { value: true });
exports.housingSearchModel = exports.housingEvaluation = exports.housingDataset = exports.housingTestCases = void 0;
exports.runHousingEvaluations = runHousingEvaluations;
exports.runScenarioEvaluation = runScenarioEvaluation;
const weave = __importStar(require("weave"));
const multi_agent_system_mcp_1 = require("../multi-agent-system-mcp");
// Test cases for housing search evaluation
const housingTestCases = [
    // Female housemate searches
    {
        id: 'female_housemate_1',
        query: 'Looking for a female housemate in a shared apartment',
        expectedCriteria: {
            genderPreference: 'female',
            keywords: ['female', 'housemate', 'shared']
        },
        expectedMinResults: 1,
        scenario: 'female_housemate'
    },
    {
        id: 'female_housemate_2',
        query: 'Female roommate wanted for house share',
        expectedCriteria: {
            genderPreference: 'female',
            keywords: ['female', 'roommate', 'house', 'share']
        },
        expectedMinResults: 1,
        scenario: 'female_housemate'
    },
    {
        id: 'female_housemate_3',
        query: 'Seeking female flatmate for apartment',
        expectedCriteria: {
            genderPreference: 'female',
            keywords: ['female', 'flatmate', 'apartment']
        },
        expectedMinResults: 1,
        scenario: 'female_housemate'
    },
    // Private bathroom under budget
    {
        id: 'private_bath_budget_1',
        query: 'Room with private bathroom under $2000',
        expectedCriteria: {
            maxPrice: 2000,
            privateBath: true,
            keywords: ['private', 'bathroom', 'under']
        },
        expectedMinResults: 1,
        scenario: 'private_bath_budget'
    },
    {
        id: 'private_bath_budget_2',
        query: 'Private bath room under $1800 budget',
        expectedCriteria: {
            maxPrice: 1800,
            privateBath: true,
            keywords: ['private', 'bath', 'under', 'budget']
        },
        expectedMinResults: 1,
        scenario: 'private_bath_budget'
    },
    {
        id: 'private_bath_budget_3',
        query: 'Ensuite room for under $2200',
        expectedCriteria: {
            maxPrice: 2200,
            privateBath: true,
            keywords: ['ensuite', 'under']
        },
        expectedMinResults: 1,
        scenario: 'private_bath_budget'
    },
    // Young roommates under 30
    {
        id: 'young_roommates_1',
        query: 'Looking for young roommates under 30',
        expectedCriteria: {
            keywords: ['young', 'roommates', 'under', '30']
        },
        expectedMinResults: 1,
        scenario: 'young_roommates'
    },
    {
        id: 'young_roommates_2',
        query: 'Room in house with people in their 20s',
        expectedCriteria: {
            keywords: ['room', 'house', '20s']
        },
        expectedMinResults: 1,
        scenario: 'young_roommates'
    },
    {
        id: 'young_roommates_3',
        query: 'Share with young professionals under 30',
        expectedCriteria: {
            keywords: ['share', 'young', 'professionals', 'under', '30']
        },
        expectedMinResults: 1,
        scenario: 'young_roommates'
    },
    // Oakland commute
    {
        id: 'oakland_commute_1',
        query: 'Room with easy commute to Oakland',
        expectedCriteria: {
            keywords: ['room', 'commute', 'oakland']
        },
        expectedMinResults: 1,
        scenario: 'oakland_commute'
    },
    {
        id: 'oakland_commute_2',
        query: 'Housing near Oakland for work',
        expectedCriteria: {
            keywords: ['housing', 'near', 'oakland', 'work']
        },
        expectedMinResults: 1,
        scenario: 'oakland_commute'
    },
    {
        id: 'oakland_commute_3',
        query: 'Apartment close to Oakland downtown',
        expectedCriteria: {
            keywords: ['apartment', 'close', 'oakland', 'downtown']
        },
        expectedMinResults: 1,
        scenario: 'oakland_commute'
    },
    // Combined criteria
    {
        id: 'combined_1',
        query: 'Female roommate, private bath, under $2000, near Oakland',
        expectedCriteria: {
            genderPreference: 'female',
            maxPrice: 2000,
            privateBath: true,
            keywords: ['female', 'roommate', 'private', 'bath', 'under', 'oakland']
        },
        expectedMinResults: 1,
        scenario: 'combined'
    },
    {
        id: 'combined_2',
        query: 'Young female housemate, ensuite, budget $1800, Oakland area',
        expectedCriteria: {
            genderPreference: 'female',
            maxPrice: 1800,
            privateBath: true,
            keywords: ['young', 'female', 'housemate', 'ensuite', 'budget', 'oakland']
        },
        expectedMinResults: 1,
        scenario: 'combined'
    },
    {
        id: 'combined_3',
        query: 'Room for female under $2200 with private bathroom near Oakland',
        expectedCriteria: {
            genderPreference: 'female',
            maxPrice: 2200,
            privateBath: true,
            keywords: ['room', 'female', 'under', 'private', 'bathroom', 'near', 'oakland']
        },
        expectedMinResults: 1,
        scenario: 'combined'
    }
];
exports.housingTestCases = housingTestCases;
// Create dataset
const housingDataset = new weave.Dataset({
    name: 'Housing Search Evaluation Dataset',
    rows: housingTestCases,
});
exports.housingDataset = housingDataset;
// Simplified scoring functions that return just numbers
const resultCountScorer = weave.op(({ modelOutput, datasetRow }) => {
    const results = modelOutput?.results || [];
    const meetsMinimum = results.length >= datasetRow.expectedMinResults;
    return meetsMinimum ? 1 : 0;
}, { name: 'result_count_score' });
const priceFilterScorer = weave.op(({ modelOutput, datasetRow }) => {
    const results = modelOutput?.results || [];
    const expectedCriteria = datasetRow.expectedCriteria;
    if (!expectedCriteria.maxPrice) {
        return 1; // No price filter to check
    }
    const withinBudget = results.every((r) => {
        return !r.price || r.price <= expectedCriteria.maxPrice;
    });
    return withinBudget ? 1 : 0;
}, { name: 'price_filter_score' });
const genderPreferenceScorer = weave.op(({ modelOutput, datasetRow }) => {
    const results = modelOutput?.results || [];
    const expectedCriteria = datasetRow.expectedCriteria;
    if (!expectedCriteria.genderPreference) {
        return 1; // No gender preference to check
    }
    const hasGenderMatches = results.some((r) => {
        return r.genderPreference === expectedCriteria.genderPreference || r.genderPreference === 'any';
    });
    return hasGenderMatches ? 1 : 0;
}, { name: 'gender_preference_score' });
const privateBathScorer = weave.op(({ modelOutput, datasetRow }) => {
    const results = modelOutput?.results || [];
    const expectedCriteria = datasetRow.expectedCriteria;
    if (expectedCriteria.privateBath === undefined) {
        return 1; // No private bath requirement to check
    }
    const hasPrivateBath = results.some((r) => {
        return r.privateBath === expectedCriteria.privateBath;
    });
    return hasPrivateBath ? 1 : 0;
}, { name: 'private_bath_score' });
const keywordRelevanceScorer = weave.op(({ modelOutput, datasetRow }) => {
    const results = modelOutput?.results || [];
    const expectedKeywords = datasetRow.expectedCriteria.keywords || [];
    if (results.length === 0 || expectedKeywords.length === 0) {
        return 0;
    }
    // Define synonym mappings for better keyword matching
    const synonyms = {
        'female': ['woman', 'girl', 'lady'],
        'male': ['man', 'guy', 'gentleman'],
        'roommate': ['housemate', 'flatmate', 'room mate', 'house mate'],
        'private': ['own', 'personal', 'ensuite', 'en-suite'],
        'bathroom': ['bath', 'restroom', 'toilet'],
        'young': ['younger', 'youthful', '20s', 'twenties'],
        'professional': ['working', 'career', 'job'],
        'under': ['below', 'less than', '<', 'max', 'budget'],
        'near': ['close', 'nearby', 'proximity', 'commute'],
        'oakland': ['oak', 'east bay'],
        'apartment': ['apt', 'flat'],
        'house': ['home', 'housing'],
        'room': ['bedroom', 'space']
    };
    let totalRelevance = 0;
    results.forEach((result) => {
        const description = (result.description || '').toLowerCase();
        const title = (result.title || '').toLowerCase();
        const explanation = (result.explanation || '').toLowerCase();
        const fullText = `${description} ${title} ${explanation}`;
        let keywordMatches = 0;
        expectedKeywords.forEach((keyword) => {
            const keywordLower = keyword.toLowerCase();
            // Check for exact match
            if (fullText.includes(keywordLower)) {
                keywordMatches++;
            }
            else {
                // Check for synonyms
                const keywordSynonyms = synonyms[keywordLower] || [];
                const foundSynonym = keywordSynonyms.some(synonym => fullText.includes(synonym.toLowerCase()));
                if (foundSynonym) {
                    keywordMatches += 0.8; // Partial credit for synonyms
                }
            }
        });
        const resultRelevance = Math.min(keywordMatches / expectedKeywords.length, 1.0);
        totalRelevance += resultRelevance;
    });
    return totalRelevance / results.length;
}, { name: 'keyword_relevance_score' });
const responseTimeScorer = weave.op(({ modelOutput }) => {
    const responseTime = modelOutput?.metadata?.responseTime || 0;
    // Score based on response time: excellent < 5s, good < 10s, acceptable < 20s
    if (responseTime < 5000)
        return 1.0;
    if (responseTime < 10000)
        return 0.8;
    if (responseTime < 20000)
        return 0.6;
    return 0.4;
}, { name: 'response_time_score' });
// Model wrapper for the housing system
const housingSearchModel = weave.op(async function housingSearchModel({ datasetRow }) {
    const startTime = Date.now();
    try {
        console.log(`🏠 Processing query: "${datasetRow.query}"`);
        const system = new multi_agent_system_mcp_1.MCPMultiAgentHousingSystem();
        await system.initialize();
        const results = await system.processQuery(datasetRow.query);
        const endTime = Date.now();
        console.log(`🏠 Query completed. Results count: ${results.length}`);
        return {
            results,
            metadata: {
                responseTime: endTime - startTime,
                query: datasetRow.query,
                scenario: datasetRow.scenario,
                timestamp: new Date().toISOString()
            }
        };
    }
    catch (error) {
        const endTime = Date.now();
        console.error(`❌ Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return {
            results: [],
            error: error instanceof Error ? error.message : 'Unknown error',
            metadata: {
                responseTime: endTime - startTime,
                query: datasetRow.query,
                scenario: datasetRow.scenario,
                timestamp: new Date().toISOString()
            }
        };
    }
}, { name: 'housing_search_system' });
exports.housingSearchModel = housingSearchModel;
// Create evaluation with simplified scorers
const housingEvaluation = new weave.Evaluation({
    dataset: housingDataset,
    scorers: [
        resultCountScorer,
        priceFilterScorer,
        genderPreferenceScorer,
        privateBathScorer,
        keywordRelevanceScorer,
        responseTimeScorer
    ],
});
exports.housingEvaluation = housingEvaluation;
// Function to run evaluations
async function runHousingEvaluations() {
    console.log('🧪 Starting Housing Search Evaluations...');
    try {
        // Initialize Weave
        await weave.init('housing-data-collector');
        console.log('✅ Weave initialized');
        console.log('🔄 Running evaluation...');
        const results = await housingEvaluation.evaluate({ model: housingSearchModel });
        console.log('\n✅ Evaluation completed successfully!');
        console.log('📊 Evaluation Results Summary:');
        console.log('================================');
        console.log(JSON.stringify(results, null, 2));
        // Log URL to view results in Weave
        console.log('\n🔗 View detailed results in Weave:');
        console.log('   https://wandb.ai/weave');
        console.log('\n🎯 Evaluation complete! Check the Weave dashboard for detailed results.');
        // Ensure proper cleanup
        console.log('\n🔄 Finalizing evaluation...');
        // Add a small delay to ensure all Weave operations complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Evaluation finalized and saved to Weave!');
        console.log('📋 Summary:');
        console.log(`   • Total tests: ${housingTestCases.length}`);
        console.log(`   • Success rate: ${results.model_success?.true_fraction * 100}%`);
        console.log(`   • Average response time: ${Math.round(results.model_latency?.mean * 1000)}ms`);
        console.log(`   • Result count score: ${Math.round((results.result_count_score?.mean || 0) * 100)}%`);
        console.log(`   • Price filter score: ${Math.round((results.price_filter_score?.mean || 0) * 100)}%`);
        console.log(`   • Gender preference score: ${Math.round((results.gender_preference_score?.mean || 0) * 100)}%`);
        console.log(`   • Private bath score: ${Math.round((results.private_bath_score?.mean || 0) * 100)}%`);
        console.log(`   • Keyword relevance score: ${Math.round((results.keyword_relevance_score?.mean || 0) * 100)}%`);
        console.log(`   • Response time score: ${Math.round((results.response_time_score?.mean || 0) * 100)}%`);
        return results;
    }
    catch (error) {
        console.error('❌ Evaluation failed:', error);
        console.error('Error details:', error);
        throw error;
    }
    finally {
        // Ensure we exit cleanly
        console.log('\n👋 Evaluation process completed');
        // Force exit after a short delay to prevent hanging
        setTimeout(() => {
            console.log('🔚 Exiting...');
            process.exit(0);
        }, 1000);
    }
}
// Function to run specific scenario evaluations
async function runScenarioEvaluation(scenario) {
    const scenarioTests = housingTestCases.filter(test => test.scenario === scenario);
    if (scenarioTests.length === 0) {
        throw new Error(`No tests found for scenario: ${scenario}`);
    }
    const scenarioDataset = new weave.Dataset({
        name: `Housing Search - ${scenario}`,
        rows: scenarioTests,
    });
    const scenarioEvaluation = new weave.Evaluation({
        dataset: scenarioDataset,
        scorers: [
            resultCountScorer,
            priceFilterScorer,
            genderPreferenceScorer,
            privateBathScorer,
            keywordRelevanceScorer,
            responseTimeScorer
        ],
    });
    console.log(`🧪 Running evaluations for scenario: ${scenario}`);
    await weave.init('housing-data-collector');
    const results = await scenarioEvaluation.evaluate({ model: housingSearchModel });
    console.log(`\n📊 Results for ${scenario}:`);
    console.log(JSON.stringify(results, null, 2));
    return results;
}
