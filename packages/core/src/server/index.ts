import { createServer as createHttpServer } from 'http';
import { FileSystemRouter } from '../router/fs-router.js';
import { renderToStream } from '../render/ssr.js';
import { createElement } from 'react';

export interface ServerOptions {
  appDir: string;
  port?: number;
  hostname?: string;
}

export async function createServer(options: ServerOptions) {
  const { appDir, port = 3000, hostname = 'localhost' } = options;
  
  const router = new FileSystemRouter(appDir);
  await router.scan();
  
  const server = createHttpServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    
    try {
      const match = router.match(url.pathname);
      
      if (!match) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - Not Found</h1>');
        return;
      }
      
      // 动态导入页面组件
      const pageModule = await import(match.route.filePath);
      const PageComponent = pageModule.default;
      
      if (!PageComponent) {
        throw new Error(`No default export found in ${match.route.filePath}`);
      }
      
      const element = createElement(PageComponent, match.params);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.write('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="root">');
      
      const stream = renderToStream(element, {
        onShellReady() {
          stream.pipe(res);
        },
        onShellError(error) {
          console.error('Shell error:', error);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>500 - Internal Server Error</h1>');
        },
        onError(error) {
          console.error('Render error:', error);
        }
      });
      
      res.write('</div></body></html>');
    } catch (error) {
      console.error('Server error:', error);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h1>500 - Internal Server Error</h1>');
    }
  });
  
  return {
    listen: () => {
      return new Promise<void>((resolve) => {
        server.listen(port, hostname, () => {
          console.log(`Server running at http://${hostname}:${port}`);
          resolve();
        });
      });
    },
    close: () => {
      return new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  };
}
