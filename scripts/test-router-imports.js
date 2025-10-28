#!/usr/bin/env node
/**
 * Test each router import individually to identify the hanging module
 */

console.log('🔍 Testing router.js imports individually...');

const imports = [
  // Node.js core modules
  { path: 'node:crypto', name: 'Node.js crypto', expected: true },
  { path: 'node:url', name: 'Node.js URL', expected: true },
  
  // Application modules (in order of import) - adjusted paths for scripts directory
  { path: '../server/state/sessionStore.js', name: 'Session Store' },
  { path: '../server/state/validateSession.js', name: 'Validate Session' },
  { path: '../server/state/constants.js', name: 'Constants' },
  { path: '../server/httpUtils.js', name: 'HTTP Utils' },
  { path: '../server/state/conversationEngine.js', name: 'Conversation Engine' },
  { path: '../server/state/complianceSystem.js', name: 'Compliance System' },
  { path: '../server/state/enhancedGuardrails.js', name: 'Enhanced Guardrails' },
  { path: '../server/state/regulatoryChangeManager.js', name: 'Regulatory Change Manager' },
  { path: '../server/education/pdfGenerator.js', name: 'PDF Generator' },
  { path: '../server/report/reportStore.js', name: 'Report Store' },
  { path: '../server/report/reportGenerator.js', name: 'Report Generator' },
  { path: '../server/websocket/sessionMonitor.js', name: 'Session Monitor' },
  { path: '../server/monitoring/performanceMonitor.js', name: 'Performance Monitor' },
  { path: '../server/monitoring/dashboardApi.js', name: 'Dashboard API' },
  { path: '../server/monitoring/logger.js', name: 'Logger' }
];

async function testImport(importInfo, index, total) {
  const { path, name, expected = false } = importInfo;
  
  console.log(`\n[${index + 1}/${total}] 📦 Testing: ${name}`);
  console.log(`    Path: ${path}`);
  
  const startTime = Date.now();
  
  try {
    // Set a timeout for each import test
    const importPromise = import(path);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Import timeout')), 10000); // 10 second timeout
    });
    
    await Promise.race([importPromise, timeoutPromise]);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (duration > 5000) {
      console.log(`⚠️  SLOW: ${name} (${duration}ms) - This might be the issue!`);
    } else {
      console.log(`✅ SUCCESS: ${name} (${duration}ms)`);
    }
    
    return { success: true, duration, name, path };
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (error.message === 'Import timeout') {
      console.log(`🚨 TIMEOUT: ${name} (${duration}ms) - This is likely the problematic import!`);
      return { success: false, timeout: true, duration, name, path };
    } else {
      console.log(`❌ ERROR: ${name} (${duration}ms)`);
      console.log(`    Error: ${error.message}`);
      return { success: false, error: error.message, duration, name, path };
    }
  }
}

async function main() {
  console.log(`Starting systematic import test of ${imports.length} modules...\n`);
  
  const results = [];
  let foundProblem = false;
  
  for (let i = 0; i < imports.length; i++) {
    const result = await testImport(imports[i], i, imports.length);
    results.push(result);
    
    // If we find a timeout or very slow import, that's likely our culprit
    if (result.timeout || result.duration > 5000) {
      console.log(`\n🎯 FOUND PROBLEMATIC IMPORT: ${result.name}`);
      console.log(`    Path: ${result.path}`);
      console.log(`    Issue: ${result.timeout ? 'Timeout (hanging)' : 'Very slow'}`);
      foundProblem = true;
      break;
    }
    
    // If we get an error, that might also be the issue
    if (!result.success && !result.timeout) {
      console.log(`\n🎯 FOUND IMPORT ERROR: ${result.name}`);
      console.log(`    Path: ${result.path}`);
      console.log(`    Error: ${result.error}`);
      foundProblem = true;
      break;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT TEST SUMMARY');
  console.log('='.repeat(60));
  
  if (foundProblem) {
    const problemImport = results.find(r => r.timeout || r.duration > 5000 || !r.success);
    console.log(`\n🚨 PROBLEMATIC IMPORT IDENTIFIED:`);
    console.log(`   Module: ${problemImport.name}`);
    console.log(`   Path: ${problemImport.path}`);
    console.log(`   Issue: ${problemImport.timeout ? 'Hanging/Timeout' : problemImport.error ? 'Import Error' : 'Very Slow'}`);
    
    console.log(`\n💡 RECOMMENDED ACTIONS:`);
    console.log(`   1. Check ${problemImport.path} for:`);
    console.log(`      - Circular dependencies`);
    console.log(`      - Top-level await statements`);
    console.log(`      - Missing dependencies`);
    console.log(`      - Syntax errors`);
    console.log(`   2. Temporarily comment out this import in router.js`);
    console.log(`   3. Test the main server: npm run dev`);
    
  } else {
    console.log(`\n✅ All imports completed successfully!`);
    console.log(`   The hanging issue might be elsewhere in the router.js file.`);
  }
  
  // Show timing summary
  console.log(`\n⏱️  TIMING SUMMARY:`);
  results.forEach(result => {
    const status = result.success ? '✅' : (result.timeout ? '🚨' : '❌');
    console.log(`   ${status} ${result.name}: ${result.duration}ms`);
  });
  
  console.log(`\nTest completed. ${results.filter(r => r.success).length}/${results.length} imports successful.`);
}

// Run the test
main().catch(error => {
  console.error('\n💥 Test script crashed:', error);
  process.exit(1);
});