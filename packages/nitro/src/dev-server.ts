import {
  createApp,
  defineEventHandler,
  getRequestURL,
  eventHandler,
  setResponseHeader,
} from 'h3';
import { toNodeHandler } from 'h3/node';
import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { readdir } from 'fs/promises';
import { join } from 'pathe';
import type { ViteDevServer } from 'vite';
// 直接导入 React（作为 SSR external，由 Node.js 加载）
import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

export interface DevServerOptions {
  appDir: string;
  port?: number;
  rootDir?: string;
  vite: ViteDevServer;
}

/**
 * 简单的文件系统路由器
 */
class SimpleRouter {
  private appDir: string;
  private routes: Map<string, string> = new Map();
  private dynamicRoutes: Array<{
    pattern: RegExp;
    paramNames: string[];
    filePath: string;
  }> = [];

  constructor(appDir: string) {
    this.appDir = appDir;
  }

  async scan(): Promise<void> {
    await this.scanDir(this.appDir, '');
  }

  private async scanDir(dir: string, basePath: string): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // 检查是否是动态路由 [param]
          if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
            const paramName = entry.name.slice(1, -1);
            await this.scanDir(fullPath, `${basePath}/:${paramName}`);
          } else {
            await this.scanDir(fullPath, `${basePath}/${entry.name}`);
          }
        } else if (entry.name === 'page.tsx' || entry.name === 'page.jsx') {
          const routePath = basePath || '/';

          // 检查是否包含动态参数
          if (routePath.includes(':')) {
            const paramNames: string[] = [];
            const patternStr = routePath.replace(/:([^/]+)/g, (_, name) => {
              paramNames.push(name);
              return '([^/]+)';
            });
            this.dynamicRoutes.push({
              pattern: new RegExp(`^${patternStr}$`),
              paramNames,
              filePath: fullPath,
            });
          } else {
            this.routes.set(routePath, fullPath);
          }
        }
      }
    } catch (e) {
      console.error('Scan error:', e);
    }
  }

  match(
    pathname: string
  ): { filePath: string; params: Record<string, string> } | null {
    // 先检查静态路由
    const staticMatch = this.routes.get(pathname);
    if (staticMatch) {
      return { filePath: staticMatch, params: {} };
    }

    // 再检查动态路由
    for (const route of this.dynamicRoutes) {
      const match = pathname.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        return { filePath: route.filePath, params };
      }
    }

    return null;
  }
}

export async function startNitroDevServer(options: DevServerOptions): Promise<{
  server: ReturnType<typeof createServer>;
  close: () => Promise<void>;
}> {
  const { appDir, port = 3000, vite } = options;

  // 创建路由器并扫描
  const router = new SimpleRouter(appDir);
  await router.scan();

  // 创建 h3 应用
  const app = createApp();

  // 使用 Vite 中间件处理静态资源和 HMR
  app.use(
    eventHandler((event) => {
      // 让 Vite 处理其自己的请求（HMR, 静态资源等）
      const url = event.path;

      // Vite 特有的路径
      if (
        url.startsWith('/@') ||
        url.startsWith('/__vite') ||
        url.startsWith('/node_modules/')
      ) {
        return new Promise<void>((resolve) => {
          const req = event.node?.req as IncomingMessage | undefined;
          const res = event.node?.res as ServerResponse | undefined;
          if (req && res) {
            vite.middlewares(req, res, () => {
              resolve();
            });
          } else {
            resolve();
          }
        });
      }
      return undefined;
    })
  );

  // 主页面处理器
  app.use(
    defineEventHandler(async (event) => {
      const url = getRequestURL(event);

      // 跳过静态资源
      if (
        url.pathname.match(
          /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/
        )
      ) {
        return;
      }

      try {
        const match = router.match(url.pathname);

        if (!match) {
          setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
          return `<!DOCTYPE html>
<html>
  <head><title>404 - Not Found</title></head>
  <body>
    <h1>404 - Not Found</h1>
    <p>Path: ${url.pathname}</p>
    <p><a href="/">Go to Home</a></p>
  </body>
</html>`;
        }

        // 使用 Vite SSR 加载页面组件（TSX 文件需要 Vite 转换）
        const mod = await vite.ssrLoadModule(match.filePath);
        const Component = mod.default || mod;

        // 使用 Node.js 直接加载的 React 进行渲染
        const element = React.createElement(Component, {
          params: match.params,
        });
        const content = ReactDOMServer.renderToString(element);

        // 获取 Vite 注入的脚本（用于 HMR）
        const viteScripts = `
    <script type="module" src="/@vite/client"></script>
    <script type="module">
      import RefreshRuntime from '/@react-refresh'
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>`;

        const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Last.js App</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 0;
      }
    </style>
    ${viteScripts}
  </head>
  <body>
    <div id="root">${content}</div>
  </body>
</html>`;

        setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
        return html;
      } catch (error) {
        console.error('Request handler error:', error);

        // 使用 Vite 的错误覆盖层
        vite.ssrFixStacktrace(error as Error);

        setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
        return `<!DOCTYPE html>
<html>
  <head><title>500 - Server Error</title></head>
  <body>
    <h1>500 - Internal Server Error</h1>
    <pre style="background: #f5f5f5; padding: 20px; overflow: auto;">${error instanceof Error ? error.stack : String(error)}</pre>
  </body>
</html>`;
      }
    })
  );

  // 创建 HTTP 服务器
  const server = createServer(toNodeHandler(app));

  // 启动监听
  await new Promise<void>((resolve) => {
    server.listen(port, () => {
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
