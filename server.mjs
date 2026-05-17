import { createReadStream, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { createServer } from 'node:http';

const root = resolve('.');
const port = 4173;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

createServer((request, response) => {
  const requestedPath = new URL(request.url, `http://${request.headers.host}`).pathname;
  const filePath = resolve(join(root, requestedPath === '/' ? 'index.html' : requestedPath));
  const normalizedRoot = root.toLowerCase();
  const normalizedFilePath = filePath.toLowerCase();

  if (!normalizedFilePath.startsWith(normalizedRoot) || !existsSync(filePath)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Voice tracker preview: http://127.0.0.1:${port}`);
});
