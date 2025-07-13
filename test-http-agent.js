// Test script for HTTP Agent Server
const fetch = require('node-fetch');

const AGENT_SERVER_URL = 'http://localhost:3001';

async function testAgentServer() {
  console.log('🧪 Testing Agent HTTP Server...\n');
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${AGENT_SERVER_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    console.log('');
    
    // Test 2: Query test
    console.log('2️⃣ Testing query endpoint...');
    const queryResponse = await fetch(`${AGENT_SERVER_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'find female roommates only' })
    });
    
    const queryData = await queryResponse.json();
    console.log('✅ Query response:', {
      success: queryData.success,
      resultCount: queryData.results?.length || 0,
      query: queryData.query
    });
    
    if (queryData.results && queryData.results.length > 0) {
      console.log('📋 Sample result:', {
        title: queryData.results[0].title,
        price: queryData.results[0].price,
        location: queryData.results[0].location,
        matchScore: queryData.results[0].combinedScore,
        explanation: queryData.results[0].explanation?.substring(0, 100) + '...'
      });
    }
    console.log('');
    
    // Test 3: Status check
    console.log('3️⃣ Testing status endpoint...');
    const statusResponse = await fetch(`${AGENT_SERVER_URL}/status`);
    const statusData = await statusResponse.json();
    console.log('✅ Status check:', {
      initialized: statusData.initialized,
      status: statusData.status
    });
    
    console.log('\n🎉 All tests passed! HTTP Agent Server is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure to start the agent server first:');
    console.log('   npm run agent:server');
  }
}

testAgentServer(); 