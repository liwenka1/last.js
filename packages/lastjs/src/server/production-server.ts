/**
 * Last.js Production Server - 基于官方 @vitejs/plugin-rsc
 */

import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile, existsSync } from 'node:fs';
import { promisify } from 'node:util';

const readFileAsync = promisify(readFile);

export interface ProductionServerOptions {
  /** 构建输出目录 */
  buildDir: string;
  /** app 目录路径 */
  appDir: string;
  /** 端口号 */
  port?: number;
}

export interface ProductionServerResult {
  /** HTTP 服务器实例 */
  server: ReturnType<typeof createServer>;
  /** 关闭服务器 */
  close: () => Promise<void>;
}

const MIME_TYPES: Record<string, string> = {
  js: 'application/javascript',
  css: 'text/css',
  html: 'text/html',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  eot: 'application/vnd.ms-fontobject',
};

/**
 * 将 Node.js IncomingMessage 转换为 Web API Request
 */
function nodeRequestToWebRequest(req: IncomingMessage): Request {
  const protocol = 'encrypted' in req.socket && req.socket.encrypted ? 'https' : 'http';
  const host = req.headers.host || 'localhost';
  const url = `${protocol}://${host}${req.url}`;
  
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, v);
        }
      } else {
        headers.set(key, value);
      }
    }
  }
  
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  
  return new Request(url, {
    method: req.method || 'GET',
    headers,
    body: hasBody ? (req as any) : undefined,
  });
}

/**
 * 将 Web API Response 转换为 Node.js ServerResponse
 */
async function webResponseToNodeResponse(
  webResponse: Response,
  res: ServerResponse
) {
  res.statusCode = webResponse.status;
  
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  
  if (webResponse.body) {
    const reader = webResponse.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } catch (error) {
      console.error('[Production] Stream error:', error);
    }
  }
  
  res.end();
}

/**
 * 启动生产服务器
 */
export async function startProductionServer(
  options: ProductionServerOptions
): Promise<ProductionServerResult> {
  const { buildDir, appDir, port = 3000 } = options;

  // 设置环境变量
  process.env.APP_DIR = appDir;
  process.env.NODE_ENV = 'production';

  // ✅ 加载构建后的 RSC Entry
  const rscEntryPath = pathToFileURL(join(buildDir, 'rsc/index.js')).href;
  
  console.log('[Production] Loading RSC entry:', rscEntryPath);

  let rscEntry: any;

  try {
    rscEntry = await import(rscEntryPath);
    console.log('[Production] RSC entry loaded successfully');
  } catch (error) {
    console.error('[Production] Failed to load RSC entry:', error);
    throw error;
  }

  const clientDir = join(buildDir, 'client');

  // 创建 HTTP 服务器
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = url.pathname;

    try {
      // 静态资源
      if (
        pathname.startsWith('/assets/') ||
        pathname.endsWith('.js') ||
        pathname.endsWith('.css') ||
        pathname.endsWith('.map')
      ) {
        const filePath = join(clientDir, pathname);
        
        if (existsSync(filePath)) {
          try {
            const content = await readFileAsync(filePath);
            const ext = pathname.split('.').pop() || '';
            res.setHeader(
              'Content-Type',
              MIME_TYPES[ext] || 'application/octet-stream'
            );
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.statusCode = 200;
            res.end(content);
            return;
          } catch (err) {
            console.error('[Production] Error reading file:', filePath, err);
            res.statusCode = 404;
            res.end('Not Found');
            return;
          }
        } else {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }
      }

      // Server Actions
      if (pathname === '/_actions' && req.method === 'POST') {
        let body = '';
        
        for await (const chunk of req) {
          body += chunk;
        }

        try {
          const { actionId, args } = JSON.parse(body);

          if (!actionId) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Missing actionId' }));
            return;
          }

          const result = await rscEntry.handleServerAction(actionId, args || []);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, data: result }));
        } catch (error) {
          console.error('[Production] Server Action error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          );
        }
        return;
      }

      // ✅ 页面请求 - 使用官方标准方式
      const handler = rscEntry.default;

      if (!handler || typeof handler !== 'function') {
        throw new Error('RSC entry must export default request handler');
      }

      // 转换并调用
      console.log(`[Production] Request: ${pathname}`);
      const webRequest = nodeRequestToWebRequest(req);
      const webResponse = await handler(webRequest);
      await webResponseToNodeResponse(webResponse, res);

    } catch (error) {
      console.error('[Production] Error:', error);

      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/html');
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Error</title></head>
          <body>
            <h1>Server Error</h1>
            <pre>${error instanceof Error ? error.stack : String(error)}</pre>
          </body>
          </html>
        `);
      } else {
        res.end();
      }
    }
  });

  // 启动服务器
  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      console.log(`[Production] Server running at http://localhost:${port}`);
      resolve();
    });
  });

  return {
    server,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}
