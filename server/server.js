import http from "node:http";
import { readFileSync } from "node:fs";
import { handleRequest } from "./router.js";
import { sessionMonitor } from "./websocket/sessionMonitor.js";

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
  console.log('Loaded environment variables from .env file');
} catch (error) {
  // .env file doesn't exist or can't be read, which is fine
}

const port = Number(process.env.PORT ?? 4000);

const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (error) {
    console.error("Unexpected server error", error);
    res.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(port, async () => {
  console.log(`Server ready on http://localhost:${port}`);

  // Initialize WebSocket session monitor
  try {
    await sessionMonitor.initialize(server);
  } catch (error) {
    console.error('Failed to initialize WebSocket session monitor', error);
  }
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("Server stopped");
    process.exit(0);
  });
});
