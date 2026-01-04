import {
  createApp,
  defineEventHandler,
  getRequestURL,
  eventHandler,
  setResponseHeader,
  toNodeListener,
} from 'h3';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ViteDevServer } from 'vite';
import { FileSystemRouter } from '../router/fs-router.js';
import {
  renderComponent,
  generateHTML,
  generate404HTML,
  generateErrorHTML,
  getViteHMRScripts,
} from '../render/index.js';

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
 * 启动开发服务器
 */
export async function startDevServer(
  options: DevServerOptions
): Promise<DevServerResult> {
  const { appDir, port = 3000, vite } = options;

  // 创建路由器并扫描
  const router = new FileSystemRouter(appDir);
  await router.scan();

  // 创建 h3 应用
  const app = createApp();

  // Vite 中间件 - 处理 HMR 和静态资源
  app.use(
    eventHandler((event) => {
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
            vite.middlewares(req, res, () => resolve());
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
          return generate404HTML(url.pathname);
        }

        // 使用 Vite SSR 加载页面组件
        const mod = await vite.ssrLoadModule(match.filePath);
        const Component = mod.default || mod;

        // 渲染组件
        const content = renderComponent(Component, {
          params: match.params,
        });

        // 生成完整 HTML
        const html = generateHTML(content, {
          viteScripts: getViteHMRScripts(),
        });

        setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
        return html;
      } catch (error) {
        console.error('Request handler error:', error);

        // 使用 Vite 的错误堆栈修复
        vite.ssrFixStacktrace(error as Error);

        setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
        return generateErrorHTML(error);
      }
    })
  );

  // 创建 HTTP 服务器
  const server = createServer(toNodeListener(app));

  // 启动监听
  await new Promise<void>((resolve) => {
    server.listen(port, () => resolve());
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

