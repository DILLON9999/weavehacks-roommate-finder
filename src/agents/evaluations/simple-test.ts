import * as weave from 'weave';
import { MCPMultiAgentHousingSystem } from '../multi-agent-system-mcp';

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
const basicScorer = weave.op(
  ({ modelOutput, datasetRow }) => {
    const results = modelOutput?.results || [];
    const hasResults = results.length > 0;
    const withinBudget = results.every((r: any) => 
      !r.price || r.price <= datasetRow.expectedCriteria.maxPrice
    );
    
    return {
      score: hasResults && withinBudget ? 1 : 0,
      details: {
        hasResults,
        withinBudget,
        resultCount: results.length,
        maxPrice: datasetRow.expectedCriteria.maxPrice
      }
    };
  },
  { name: 'basic_test_score' }
);

// Simple model
const simpleModel = weave.op(async function simpleHousingTest({ datasetRow }) {
  console.log(`Testing query: "${datasetRow.query}"`);
  
  try {
    const system = new MCPMultiAgentHousingSystem();
    await system.initialize();
    
    const results = await system.processQuery(datasetRow.query);
    
    return {
      results,
      success: true,
      query: datasetRow.query
    };
  } catch (error) {
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
    
  } catch (error) {
    console.error('❌ Simple test failed:', error);
  } finally {
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

export { runSimpleTest }; 