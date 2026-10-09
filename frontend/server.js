import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ищем dist рядом с server.js (frontend/dist) или в frontend/dist от корня
const DIST = existsSync(join(__dirname, 'dist'))
  ? join(__dirname, 'dist')
  : join(__dirname, 'frontend', 'dist');

const PORT = process.env.PORT || 3000;

console.log('Serving from:', DIST);
console.log('Port:', PORT);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

createServer((req, res) => {
  // Убираем query string
  const url = req.url.split('?')[0];
  let filePath = join(DIST, url === '/' ? 'index.html' : url);

  // SPA fallback
  if (!existsSync(filePath)) filePath = join(DIST, 'index.html');

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found - dist folder missing');
    return;
  }

  try {
    const ext = extname(filePath);
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', ext === '.html' ? 'no-cache' : 'max-age=31536000,immutable');
    res.writeHead(200);
    res.end(readFileSync(filePath));
  } catch (e) {
    res.writeHead(500);
    res.end('Error: ' + e.message);
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
});
