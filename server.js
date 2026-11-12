import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const ARTICLES_PATH = path.join(__dirname, 'src', 'data', 'articles.json');
const PLANETS_PATH = path.join(__dirname, 'src', 'data', 'planetChains.json');
const STARMAP_PATH = path.join(__dirname, 'src', 'data', 'starmapNodes.json');
const SEED_PATH = path.join(__dirname, 'src', 'data', 'seed.json');

async function readJsonSafe(filePath, fallback = []) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);

    // --- API ROUTES ---
    if (pathname === '/api/compendium' && req.method === 'GET') {
      const [articles, planetChains, starmapNodes] = await Promise.all([
        readJsonSafe(ARTICLES_PATH, []),
        readJsonSafe(PLANETS_PATH, []),
        readJsonSafe(STARMAP_PATH, {})
      ]);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ articles, planetChains, starmapNodes }));
      return;
    }

    if (pathname === '/api/compendium' && req.method === 'POST') {
      const payload = await parseRequestBody(req);
      if (Array.isArray(payload.articles)) {
        await fs.writeFile(ARTICLES_PATH, JSON.stringify(payload.articles, null, 2), 'utf-8');
      }
      if (Array.isArray(payload.planetChains)) {
        await fs.writeFile(PLANETS_PATH, JSON.stringify(payload.planetChains, null, 2), 'utf-8');
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (pathname === '/api/reset' && req.method === 'POST') {
      const seed = await readJsonSafe(SEED_PATH, null);
      if (seed) {
        await fs.writeFile(ARTICLES_PATH, JSON.stringify(seed.articles, null, 2), 'utf-8');
        await fs.writeFile(PLANETS_PATH, JSON.stringify(seed.planetChains, null, 2), 'utf-8');
      }
      const [articles, planetChains, starmapNodes] = await Promise.all([
        readJsonSafe(ARTICLES_PATH, []),
        readJsonSafe(PLANETS_PATH, []),
        readJsonSafe(STARMAP_PATH, {})
      ]);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, articles, planetChains, starmapNodes }));
      return;
    }

    // --- STATIC FILE SERVING ---
    let filePath;
    if (pathname === '/' || pathname === '/index.html') {
      filePath = path.join(__dirname, 'public', 'index.html');
    } else if (pathname.startsWith('/src/')) {
      filePath = path.join(__dirname, pathname);
    } else {
      filePath = path.join(__dirname, 'public', pathname);
    }

    // Prevent directory traversal
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(__dirname)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const stat = await fs.stat(resolved).catch(() => null);
    if (!stat || !stat.isFile()) {
      // SPA fallback to index.html
      const indexFile = path.join(__dirname, 'public', 'index.html');
      const html = await fs.readFile(indexFile);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = await fs.readFile(resolved);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Galactic Compendium server running at http://localhost:${PORT}`);
});
