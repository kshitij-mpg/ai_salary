/**
 * Zero-dependency static server. Serves the SPA and /data JSON.
 * Used when Vite is not installed: `node scripts/serve.mjs`
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 5173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".map": "application/json",
  ".woff2": "font/woff2",
};

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent(reqPath.split("?")[0]);
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const resolved = path.resolve(root, "." + cleaned);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = req.url || "/";
  let filePath = null;

  if (url === "/" || url.startsWith("/index.html")) {
    filePath = path.join(appRoot, "index.html");
  } else if (url.startsWith("/data/")) {
    filePath = safeJoin(path.join(appRoot, "public"), url);
  } else if (url.startsWith("/assets/") || url.startsWith("/src/")) {
    filePath = safeJoin(appRoot, url);
  } else {
    filePath = safeJoin(appRoot, url);
  }

  if (!filePath) {
    send(res, 403, "Forbidden", "text/plain");
    return;
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      send(res, 404, "Not found", "text/plain");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Comp Intel running at http://127.0.0.1:${port}`);
  console.log("Offline · source observations, not a people database.");
});
