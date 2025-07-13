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
exports.runSimpleTest = runSimpleTest;
const weave = __importStar(require("weave"));
const multi_agent_system_mcp_1 = require("../multi-agent-system-mcp");
// Simple test case
const testCase = {
    id: 'simple_test',
    query: 'Looking for a room under $1500',
    expectedCriteria: {
        maxPrice: 1500,
        keywords: ['room', 'under']
    },
    expectedMinResults: 1,
    scenario: 'budget_test'
};
// Simple dataset with just one test
const simpleDataset = new weave.Dataset({
    name: 'Simple Housing Test',
    rows: [testCase],
});
// Simple scorer
const basicScorer = weave.op(({ modelOutput, datasetRow }) => {
    const results = modelOutput?.results || [];
    const hasResults = results.length > 0;
    const withinBudget = results.every((r) => !r.price || r.price <= datasetRow.expectedCriteria.maxPrice);
    return {
        score: hasResults && withinBudget ? 1 : 0,
        details: {
            hasResults,
            withinBudget,
            resultCount: results.length,
            maxPrice: datasetRow.expectedCriteria.maxPrice
        }
    };
}, { name: 'basic_test_score' });
// Simple model
const simpleModel = weave.op(async function simpleHousingTest({ datasetRow }) {
    console.log(`Testing query: "${datasetRow.query}"`);
    try {
        const system = new multi_agent_system_mcp_1.MCPMultiAgentHousingSystem();
        await system.initialize();
        const results = await system.processQuery(datasetRow.query);
        return {
            results,
            success: true,
            query: datasetRow.query
        };
    }
    catch (error) {
        console.error('Test failed:', error);
        return {
            results: [],
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            query: datasetRow.query
        };
    }
}, { name: 'simple_housing_test' });
// Create evaluation
const simpleEvaluation = new weave.Evaluation({
    dataset: simpleDataset,
    scorers: [basicScorer],
});
// Run the test
async function runSimpleTest() {
    console.log('🧪 Running Simple Housing Test...');
    try {
        await weave.init('housing-data-collector');
        console.log('✅ Weave initialized');
        console.log('🔄 Running simple evaluation...');
        const results = await simpleEvaluation.evaluate({ model: simpleModel });
        console.log('\n📊 Simple Test Results:');
        console.log('======================');
        console.log(JSON.stringify(results, null, 2));
        console.log('\n✅ Simple test completed successfully!');
        console.log('🔗 Check Weave dashboard: https://wandb.ai/weave');
        // Add delay for Weave to process
        console.log('\n🔄 Finalizing...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Test finalized!');
    }
    catch (error) {
        console.error('❌ Simple test failed:', error);
    }
    finally {
        console.log('\n👋 Simple test completed');
        setTimeout(() => {
            console.log('🔚 Exiting...');
            process.exit(0);
        }, 1000);
    }
}
// Run if called directly
if (require.main === module) {
    runSimpleTest();
}
