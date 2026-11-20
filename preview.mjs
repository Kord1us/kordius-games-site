import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { site } from "./site/content.mjs";

const root = fileURLToPath(new URL("./docs", import.meta.url));
const mount = new URL(site.url).pathname;
const port = Number(process.env.PORT || 4173);
const mimes = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/" || url.pathname + "/" === mount) {
      response.writeHead(302, { Location: mount }).end();
      return;
    }
    if (!url.pathname.startsWith(mount)) throw new Error("Outside preview mount");
    const local = decodeURIComponent(url.pathname.slice(mount.length));
    let file = path.resolve(root, local);
    const rel = path.relative(root, file);
    if (rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel)) throw new Error("Outside preview root");
    if ((await stat(file)).isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        response.writeHead(301, { Location: url.pathname + "/" + url.search }).end();
        return;
      }
      file = path.join(file, "index.html");
    }
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": mimes[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    }).end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" })
      .end(await readFile(path.join(root, "404.html")));
  }
}).listen(port, "127.0.0.1", () => console.log("http://127.0.0.1:" + port + mount));
