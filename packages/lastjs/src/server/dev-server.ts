/**
 * Last.js Development Server - 基于官方 @vitejs/plugin-rsc
 *
 * 请求处理流程:
 * 1. 将 Node.js HTTP Request 转换为 Web API Request
 * 2. 调用 RSC Entry Handler（handler 内部会自动处理 RSC/HTML 逻辑）
 * 3. 将 Web API Response 转换回 Node.js HTTP Response
 */

import {
  createApp,
  defineEventHandler,
  getRequestURL,
  readBody,
  createError,
} from 'h3';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ViteDevServer } from 'vite';
import { FileSystemRouter } from '../router/fs-router.js';
import { ApiRouter } from './api-router.js';

export interface DevServerOptions {
  /** app 目录路径 */
  appDir: string;
  /** 端口号 */
  port?: number;
  /** 项目根目录 */
  rootDir?: string;
  /** Vite 开发服务器实例 */
  vite: ViteDevServer;
}

export interface DevServerResult {
  /** HTTP 服务器实例 */
  server: ReturnType<typeof createServer>;
  /** 关闭服务器 */
  close: () => Promise<void>;
}

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
  
  // 对于 POST/PUT 等有 body 的请求，需要传递 body
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
  // 设置状态码
  res.statusCode = webResponse.status;
  
  // 设置 headers
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  
  // 写入 body
  if (webResponse.body) {
    const reader = webResponse.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } catch (error) {
      console.error('[Dev] Stream error:', error);
    }
  }
  
  res.end();
}

/**
 * 启动开发服务器
 */
export async function startDevServer(
  options: DevServerOptions
): Promise<DevServerResult> {
  const { appDir, port = 3000, vite } = options;

  // 设置环境变量
  process.env.APP_DIR = appDir;

  // 创建路由器（用于展示）
  const router = new FileSystemRouter(appDir);
  await router.scan();

  // 创建 API 路由器
  const apiRouter = new ApiRouter(appDir);
  await apiRouter.scan();

  // 打印路由信息
  const apiRoutes = apiRouter.getRoutes();
  if (apiRoutes.length > 0) {
    console.log(`  API routes:`);
    for (const route of apiRoutes) {
      console.log(`    ${(route.method || 'ALL').padEnd(6)} ${route.pattern}`);
    }
  }

  // 创建 h3 应用
  const app = createApp();

  // Vite 中间件 - 处理 HMR 和静态资源
  app.use(
    defineEventHandler((event) => {
      const url = event.path;

      if (
        url.startsWith('/@') ||
        url.startsWith('/__vite') ||
        url.startsWith('/node_modules/')
      ) {
        return new Promise<void>((resolve) => {
          const req = event.node?.req as IncomingMessage | undefined;
          const res = event.node?.res as ServerResponse | undefined;
          if (req && res) {
            vite.middlewares(req, res, () => resolve());
          } else {
            resolve();
          }
        });
      }
      return undefined;
    })
  );

  // API 路由处理器
  app.use(
    '/api',
    defineEventHandler(async (event) => {
      const url = getRequestURL(event);
      const method = event.method;

      const route = apiRouter.match(url.pathname, method);
      if (!route) {
        throw createError({ statusCode: 404, statusMessage: 'API not found' });
      }

      try {
        const mod = await vite.ssrLoadModule(route.filePath);
        const handler = mod[method.toLowerCase()] || mod.default;

        if (!handler || typeof handler !== 'function') {
          throw createError({
            statusCode: 500,
            statusMessage: `No ${method} handler found`,
          });
        }

        const result = await handler(event);
        return result;
      } catch (error) {
        console.error('[API] Error:', error);
        if (error instanceof Error) {
          vite.ssrFixStacktrace(error);
        }
        throw error;
      }
    })
  );

  // Server Actions 处理器
  app.use(
    '/_actions',
    defineEventHandler(async (event) => {
      if (event.method !== 'POST') {
        throw createError({ statusCode: 405, statusMessage: 'Method not allowed' });
      }

      try {
        const body = await readBody(event);
        const { actionId, args } = body;

        if (!actionId) {
          throw createError({ statusCode: 400, statusMessage: 'Missing actionId' });
        }

        // 加载 RSC Entry 的 handleServerAction
        const rscEntry = await vite.ssrLoadModule('../rsc/entry.rsc.js');
        const result = await rscEntry.handleServerAction(actionId, args || []);

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error('[Server Action] Error:', error);
        if (error instanceof Error) {
          vite.ssrFixStacktrace(error);
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  // ✅ 主页面处理器 - 官方标准方式
  app.use(
    defineEventHandler(async (event) => {
      const req = event.node?.req as IncomingMessage | undefined;
      const res = event.node?.res as ServerResponse | undefined;

      if (!req || !res) {
        throw createError({ statusCode: 500, statusMessage: 'Missing req/res' });
      }

      const url = getRequestURL(event);

      // 跳过静态资源
      if (
        url.pathname.match(
          /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/
        )
      ) {
        return;
      }

      // 让 Vite 处理源文件请求
      if (url.pathname.match(/\.(tsx?|jsx?)(\?.*)?$/)) {
        return new Promise<void>((resolve) => {
          vite.middlewares(req, res, () => resolve());
        });
      }

      try {
        // ✅ 1. 加载 RSC Entry
        const rscEntry = await vite.ssrLoadModule('../rsc/entry.rsc.js');
        const handler = rscEntry.default;

        if (!handler || typeof handler !== 'function') {
          throw new Error('RSC entry must export default request handler');
        }

        // ✅ 2. 转换 Node.js Request → Web API Request
        const webRequest = nodeRequestToWebRequest(req);

        // ✅ 3. 调用 RSC Entry Handler（自动处理 RSC/HTML）
        console.log(`[Dev] Request: ${url.pathname}`);
        const webResponse = await handler(webRequest);

        // ✅ 4. 转换 Web API Response → Node.js Response
        await webResponseToNodeResponse(webResponse, res);
      } catch (error) {
        console.error('[Dev] Error:', error);

        if (error instanceof Error) {
          vite.ssrFixStacktrace(error);
        }

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
    })
  );

  // 创建 HTTP 服务器
  const server = createServer(app);

  // 启动服务器
  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      console.log(`  ➜  Local:   http://localhost:${port}/`);
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
