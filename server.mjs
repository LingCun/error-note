import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import handler from './api/analyze.js';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };
createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/analyze') {
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
    if (req.method === 'POST') {
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 100000) { res.status(413).json({ error: '입력이 너무 큽니다.' }); return; } }
      try { req.body = JSON.parse(body); } catch { res.status(400).json({error: '잘못된 JSON입니다.'}); return; }
    }
    return handler(req, res);
  }
  const files = { '/': 'index.html', '/style.css': 'style.css', '/app.js': 'app.js', '/core.js': 'core.js' };
  if (!files[pathname]) { res.writeHead(404); res.end('Not found'); return; }
  try { const name = files[pathname]; res.setHeader('Content-Type', types[name.slice(name.lastIndexOf('.'))]); res.end(await readFile(new URL(`./public/${name}`, import.meta.url))); }
  catch { res.writeHead(500); res.end('Server error'); }
}).listen(3000, '127.0.0.1', () => console.log('Error Note ready at http://127.0.0.1:3000'));
