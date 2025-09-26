import http from "node:http";
import { handleRequest } from "./router.js";

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

server.listen(port, () => {
  console.log(`Server ready on http://localhost:${port}`);
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("Server stopped");
    process.exit(0);
  });
});
