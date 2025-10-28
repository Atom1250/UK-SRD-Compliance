import http from "node:http";
import { readFileSync } from "node:fs";

console.log('🔍 Starting minimal server to test basic functionality...');

// Load environment variables from .env file if it exists
try {
  const envFile = readFileSync('.env', 'utf8');
  const envVars = envFile.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('='))
    .filter(([key, value]) => key && value);
  
  for (const [key, value] of envVars) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  console.log('✓ Loaded environment variables from .env file');
} catch (error) {
  console.log('⚠️  .env file not found or unreadable');
}

const port = Number(process.env.PORT ?? 4000);

console.log(`🔧 Attempting to create server on port ${port}...`);

const server = http.createServer((req, res) => {
  console.log(`📥 Request: ${req.method} ${req.url}`);
  
  // Simple health check
  if (req.url === '/health') {
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '0.2.0',
      mode: 'minimal-test'
    }));
    return;
  }
  
  // Default response
  res.writeHead(200, { 
    'Content-Type': 'text/plain',
    'Access-Control-Allow-Origin': '*'
  });
  res.end('Minimal server is working! Try /health endpoint.');
});

console.log('🔧 Server created, attempting to listen...');

server.listen(port, () => {
  console.log(`✅ Minimal server ready on http://localhost:${port}`);
  console.log(`🏥 Health check: curl http://localhost:${port}/health`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

process.on("SIGINT", () => {
  console.log('\n🛑 Stopping minimal server...');
  server.close(() => {
    console.log("✅ Minimal server stopped");
    process.exit(0);
  });
});