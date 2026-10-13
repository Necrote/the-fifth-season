// Test/preview helper only. Serve dist at the Pages prefix with real 404s (no SPA fallback).
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const prefix = '/the-fifth-season/';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method ?? '')) { response.writeHead(405); response.end(); return; }
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    if (pathname === prefix.slice(0, -1)) { response.writeHead(301, { Location: prefix }); response.end(); return; }
    if (!pathname.startsWith(prefix)) { response.writeHead(404); response.end('Not found'); return; }
    const relative = pathname.slice(prefix.length) || 'index.html';
    const target = resolve(root, relative);
    if (!target.startsWith(resolve(root) + sep) || !(await stat(target)).isFile()) { response.writeHead(404); response.end('Not found'); return; }
    const file = await readFile(target);
    response.writeHead(200, { 'Content-Type': types[extname(target)] ?? 'application/octet-stream', 'Content-Length': file.length, 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : file);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.listen(4174, '127.0.0.1', () => console.log(`Static Pages preview: http://127.0.0.1:4174${prefix}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
