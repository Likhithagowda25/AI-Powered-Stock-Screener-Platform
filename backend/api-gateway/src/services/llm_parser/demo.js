// Test script for live demo of LLM Parser Service

const llmParser = require('./llmParser.service');

async function demo(userQuery) {
  console.log('\n' + '='.repeat(70));
  console.log('LIVE QUERY DEMO');
  console.log('='.repeat(70));
  console.log('\nUser Input (Natural Language):');
  console.log('> ' + userQuery);
  console.log('\n' + '-'.repeat(70));
  console.log('Processing...');
  console.log('-'.repeat(70));
  
  const result = await llmParser.processQuery(userQuery, {
    userId: 'demo_user',
    sessionId: 'demo_session'
  });
  
  if (result.success) {
    console.log('\nSTATUS: SUCCESS');
    console.log('\nGenerated DSL (JSON):');
    console.log(JSON.stringify(result.dsl, null, 2));
    console.log('\nMetadata:');
    console.log('- Request ID:', result.requestId);
    console.log('- Translation Method:', result.metadata.translationMethod);
    console.log('- Validated At:', result.metadata.validatedAt);
  } else {
    console.log('\nSTATUS: FAILED');
    console.log('\nError:');
    console.log('- Type:', result.error.type);
    console.log('- Message:', result.error.message);
  }
  
  console.log('\n' + '='.repeat(70));
}

// Get query from command line or use default
const userQuery = process.argv[2] || "Show me stocks with PE less than 15";

console.log('\n\nSTOCK SCREENER - NATURAL LANGUAGE QUERY DEMO');
console.log('Run with your own query: node demo.js "your query here"');

demo(userQuery).catch(console.error);
