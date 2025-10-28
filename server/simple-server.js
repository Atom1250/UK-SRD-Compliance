import http from "node:http";
import { readFileSync } from "node:fs";

console.log('🚀 Starting simple development server...');

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

// Simple request handler for testing
function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${port}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Health check endpoint
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '0.2.0',
      mode: 'simple-development'
    }));
    return;
  }
  
  // Basic API endpoint for testing
  if (url.pathname === '/api/test') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Simple server is working!',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    }));
    return;
  }
  
  // Serve basic HTML for root
  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>ESG Client Interview Bot - Development</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .status { color: green; font-weight: bold; }
        .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>ESG Client Interview Bot</h1>
    <p class="status">✓ Simple development server is running</p>
    
    <h2>Available Endpoints:</h2>
    <div class="endpoint">
        <strong>GET /health</strong> - Health check endpoint
    </div>
    <div class="endpoint">
        <strong>GET /api/test</strong> - Test API endpoint
    </div>
    
    <h2>Next Steps:</h2>
    <ol>
        <li>This is a simplified server for testing</li>
        <li>The full server with all features is in server/server.js</li>
        <li>Check the console for any import errors</li>
        <li>Once imports are fixed, use: npm run dev</li>
    </ol>
    
    <script>
        // Test the health endpoint
        fetch('/health')
            .then(r => r.json())
            .then(data => {
                console.log('Health check:', data);
                document.body.innerHTML += '<p style="color: green;">✓ Health check successful - see console for details</p>';
            })
            .catch(err => {
                console.error('Health check failed:', err);
                document.body.innerHTML += '<p style="color: red;">❌ Health check failed - see console for details</p>';
            });
    </script>
</body>
</html>
    `);
    return;
  }
  
  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Not Found',
    message: 'This is a simple development server. Full API not available.',
    availableEndpoints: ['/health', '/api/test', '/']
  }));
}

const server = http.createServer(handleRequest);

server.listen(port, () => {
  console.log(`✅ Simple development server ready on http://localhost:${port}`);
  console.log(`📋 Health check: http://localhost:${port}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${port}/api/test`);
  console.log('');
  console.log('This is a simplified server for testing.');
  console.log('Once import issues are resolved, use: npm run dev');
});

process.on("SIGINT", () => {
  console.log('\n🛑 Stopping simple server...');
  server.close(() => {
    console.log("✅ Simple server stopped");
    process.exit(0);
  });
});