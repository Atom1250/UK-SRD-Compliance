#!/usr/bin/env node
/**
 * Server Diagnostic Script
 * Tests server components step by step to identify issues
 */

console.log("🔍 Starting server diagnostics...");

// Test 1: Basic Node.js and imports
console.log("\n1. Testing basic imports...");
try {
  console.log("✓ http module");
  const http = await import("node:http");
  
  console.log("✓ fs module");
  const { readFileSync } = await import("node:fs");
  
  console.log("✓ Basic imports successful");
} catch (error) {
  console.error("❌ Basic imports failed:", error.message);
  process.exit(1);
}

// Test 2: Environment loading
console.log("\n2. Testing environment loading...");
try {
  const { readFileSync } = await import("node:fs");
  const envFile = readFileSync('.env', 'utf8');
  console.log("✓ .env file loaded");
  
  // Parse environment variables
  const envVars = envFile.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('='))
    .filter(([key, value]) => key && value);
  
  console.log(`✓ Found ${envVars.length} environment variables`);
} catch (error) {
  console.log("⚠️  .env file not found or unreadable (this is okay)");
}

// Test 3: Router import
console.log("\n3. Testing router import...");
try {
  console.log("  Importing router...");
  const { handleRequest } = await import("../server/router.js");
  console.log("✓ Router imported successfully");
} catch (error) {
  console.error("❌ Router import failed:", error.message);
  console.error("Stack:", error.stack);
  process.exit(1);
}

// Test 4: WebSocket monitor import
console.log("\n4. Testing WebSocket monitor import...");
try {
  console.log("  Importing session monitor...");
  const { sessionMonitor } = await import("../server/websocket/sessionMonitor.js");
  console.log("✓ Session monitor imported successfully");
} catch (error) {
  console.error("❌ Session monitor import failed:", error.message);
  console.error("Stack:", error.stack);
  process.exit(1);
}

// Test 5: Configuration system
console.log("\n5. Testing configuration system...");
try {
  console.log("  Loading configuration...");
  const config = await import("../config/index.js");
  console.log("✓ Configuration loaded successfully");
  console.log(`  Environment: ${config.NODE_ENV}`);
} catch (error) {
  console.error("❌ Configuration loading failed:", error.message);
  console.error("Stack:", error.stack);
  // Don't exit here, as the old server doesn't use the new config system
}

// Test 6: Basic server creation
console.log("\n6. Testing basic server creation...");
try {
  const http = await import("node:http");
  
  const server = http.default.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'diagnostic-ok' }));
  });
  
  console.log("✓ Server created successfully");
  
  // Test listening
  const port = 4001; // Use different port to avoid conflicts
  server.listen(port, () => {
    console.log(`✓ Server listening on port ${port}`);
    server.close(() => {
      console.log("✓ Server closed successfully");
      console.log("\n🎉 All diagnostics passed! The server should work.");
      console.log("\nTry running: npm run dev");
    });
  });
  
} catch (error) {
  console.error("❌ Server creation failed:", error.message);
  console.error("Stack:", error.stack);
  process.exit(1);
}