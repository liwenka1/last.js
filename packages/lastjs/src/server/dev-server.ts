import {
  createApp,
  defineEventHandler,
  getRequestURL,
  eventHandler,
  setResponseHeader,
  getRequestHeader,
  toNodeListener,
} from 'h3';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ViteDevServer } from 'vite';
import type { ReactNode } from 'react';
import { relative } from 'pathe';
import { FileSystemRouter } from '../router/fs-router.js';
import type { Metadata, RouteModule } from '../router/types.js';
import {
  renderWithLayouts,
  wrapWithDoctype,
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

// Layout 组件类型
type LayoutComponent = React.ComponentType<{ children: ReactNode }>;

// Page 组件类型
type PageComponent = React.ComponentType<Record<string, unknown>>;

/**
 * 将绝对路径转换为相对于项目根目录的路径（用于客户端导入）
 */
function toClientPath(absolutePath: string, rootDir: string): string {
  const relativePath = relative(rootDir, absolutePath);
  // 确保路径以 / 开头
  return '/' + relativePath;
}

/**
 * 启动开发服务器
 */
export async function startDevServer(
  options: DevServerOptions
): Promise<DevServerResult> {
  const { appDir, port = 3000, rootDir = process.cwd(), vite } = options;

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

      // 跳过静态资源（但允许 .tsx/.ts 文件通过 Vite 处理）
      if (
        url.pathname.match(
          /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/
        )
      ) {
        return;
      }

      // 让 Vite 处理源文件请求（用于客户端 hydration）
      if (url.pathname.match(/\.(tsx?|jsx?)(\?.*)?$/)) {
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

      try {
        const match = router.match(url.pathname);

        if (!match) {
          setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
          return generate404HTML(url.pathname);
        }

        // 获取 layout 链（从根到当前节点）
        const layoutPaths = router.getLayoutChain(match.node);

        // 转换为客户端可用的路径
        const clientLayoutPaths = layoutPaths.map((p) =>
          toClientPath(p, rootDir)
        );
        const clientPagePath = toClientPath(match.filePath, rootDir);

        // 页面 props
        const pageProps = {
          params: match.params,
        };

        // 加载页面模块（需要在判断客户端导航之前，因为需要获取 metadata）
        const pageMod: RouteModule = await vite.ssrLoadModule(match.filePath);

        // 获取 metadata
        let metadata: Metadata | undefined;
        if (pageMod.generateMetadata) {
          // 动态 metadata
          metadata = await pageMod.generateMetadata({
            params: match.params,
            searchParams: Object.fromEntries(url.searchParams),
          });
        } else if (pageMod.metadata) {
          // 静态 metadata
          metadata = pageMod.metadata;
        }

        // 检查是否为客户端导航请求
        const isClientNavigation =
          getRequestHeader(event, 'x-lastjs-navigation') === 'true';

        if (isClientNavigation) {
          // 客户端导航：返回 JSON 数据（包含 metadata）
          setResponseHeader(
            event,
            'Content-Type',
            'application/json; charset=utf-8'
          );
          return JSON.stringify({
            props: pageProps,
            layoutPaths: clientLayoutPaths,
            pagePath: clientPagePath,
            params: match.params,
            metadata, // 包含 metadata
          });
        }

        // 加载所有 layout 组件
        const layouts: LayoutComponent[] = [];
        for (const layoutPath of layoutPaths) {
          const mod = await vite.ssrLoadModule(layoutPath);
          layouts.push(mod.default || mod);
        }

        // 获取页面组件（pageMod 已在上面加载）
        const Page: PageComponent = pageMod.default!;

        // 渲染带有 layout 嵌套的页面
        const content = renderWithLayouts(layouts, Page, pageProps);

        // 包装为完整 HTML 文档，注入 hydration 数据和 metadata
        const html = wrapWithDoctype(content, {
          viteScripts: getViteHMRScripts(),
          hydrationData: {
            props: pageProps,
            layoutPaths: clientLayoutPaths,
            pagePath: clientPagePath,
            params: match.params,
          },
          clientEntry: '/@lastjs/client',
          metadata,
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
