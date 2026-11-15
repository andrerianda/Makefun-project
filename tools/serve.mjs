// Dev tool: static server for the game directory. usage: node serve.mjs <dir> <port>
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const [dir, port = '8124'] = process.argv.slice(2);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  try { const body = await readFile(join(dir, path === '/' || path === '\\' ? 'index.html' : path)); res.writeHead(200, { 'content-type': MIME[extname(path)] || (path === '/' ? 'text/html' : 'application/octet-stream'), 'cache-control': 'no-store' }); res.end(body); }
  catch { res.writeHead(404); res.end('not found'); }
}).listen(+port, () => console.log('serving', dir, 'on', port));
