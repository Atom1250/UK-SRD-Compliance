import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "../public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

export const sendJSON = (res, status, payload) => {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS"
  });
  res.end(body);
};

export const sendText = (res, status, text, contentType = "text/plain; charset=utf-8") => {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*"
  });
  res.end(text);
};

export const sendNoContent = (res) => {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*"
  });
  res.end();
};

export const sendOptions = (res) => {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS"
  });
  res.end();
};

export const serveStaticFile = async (res, pathname) => {
  const filePath = pathname === "/"
    ? join(publicDir, "index.html")
    : join(publicDir, pathname.replace(/^\//, ""));

  try {
    const extension = extname(filePath) || ".html";
    const contentType = mimeTypes[extension] ?? "text/plain; charset=utf-8";
    const file = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": contentType
    });
    res.end(file);
  } catch (error) {
    if (pathname !== "/" && !extname(pathname)) {
      return serveStaticFile(res, "/");
    }
    sendText(res, 404, "Not found");
  }
};
