// Local preview only: serves index.html and routes /api/check to the Vercel function.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { GET } from './api/check.js';

const PORT = Number(process.env.PORT) || 5178;

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/api/check') {
    const out = await GET(new Request(url));
    res.writeHead(out.status, Object.fromEntries(out.headers));
    return res.end(await out.text());
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(await readFile(new URL('./index.html', import.meta.url)));
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
