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
import type { ReactNode, ComponentType } from 'react';
import { relative } from 'pathe';
import { FileSystemRouter } from '../router/fs-router.js';
import type { Metadata, RouteModule } from '../router/types.js';
import {
  renderWithLayouts,
  renderToStream,
  wrapWithDoctype,
  generate404HTML,
  generateErrorHTML,
  getViteHMRScripts,
  generateHydrationScript,
  renderMetadataToHTML,
} from '../render/index.js';
import { isNotFoundError } from '../navigation/index.js';

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
          // 尝试使用自定义 not-found 组件
          const notFoundPath = router.getNotFoundPath();
          const rootLayoutPath = router.getRootLayoutPath();

          if (notFoundPath) {
            try {
              // 加载 not-found 组件
              const notFoundMod = await vite.ssrLoadModule(notFoundPath);
              const NotFound = notFoundMod.default;

              // 加载根 layout（如果存在）
              const layouts: LayoutComponent[] = [];
              if (rootLayoutPath) {
                const layoutMod = await vite.ssrLoadModule(rootLayoutPath);
                layouts.push(layoutMod.default || layoutMod);
              }

              // 渲染 not-found 页面
              const content = renderWithLayouts(layouts, NotFound, {});

              // 获取 metadata
              const metadata: Metadata = notFoundMod.metadata || {
                title: '404 - Page Not Found',
              };

              const html = wrapWithDoctype(content, {
                viteScripts: getViteHMRScripts(),
                metadata,
              });

              setResponseHeader(
                event,
                'Content-Type',
                'text/html; charset=utf-8'
              );
              // 设置 404 状态码
              event.node.res.statusCode = 404;
              return html;
            } catch (error) {
              console.error('Failed to render not-found page:', error);
            }
          }

          // 回退到默认 404 页面
          setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
          event.node.res.statusCode = 404;
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

        // 获取 error 和 loading 路径
        const errorPath = router.getErrorPath(match.node);
        const loadingPath = router.getLoadingPath(match.node);
        const clientErrorPath = errorPath
          ? toClientPath(errorPath, rootDir)
          : undefined;
        const clientLoadingPath = loadingPath
          ? toClientPath(loadingPath, rootDir)
          : undefined;

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
            metadata,
            errorPath: clientErrorPath,
            loadingPath: clientLoadingPath,
          });
        }

        // 加载所有 layout 组件
        const layouts: LayoutComponent[] = [];
        for (const layoutPath of layoutPaths) {
          const mod = await vite.ssrLoadModule(layoutPath);
          layouts.push(mod.default || mod);
        }

        // 获取页面组件（pageMod 已在上面加载）
        const Page: PageComponent | undefined = pageMod.default;

        if (!Page) {
          throw new Error(`Page component not found: ${match.filePath}`);
        }

        // 加载 loading 组件（如果存在）
        let Loading: ComponentType | undefined;
        if (loadingPath) {
          const loadingMod = await vite.ssrLoadModule(loadingPath);
          Loading = loadingMod.default;
        }

        // 加载 error 组件（如果存在）
        let ErrorComponent:
          | ComponentType<{ error: Error; reset: () => void }>
          | undefined;
        if (errorPath) {
          const errorMod = await vite.ssrLoadModule(errorPath);
          ErrorComponent = errorMod.default;
        }

        // 加载 ErrorBoundary 组件
        const { ErrorBoundary } = await import('../client/error-boundary.js');

        // 准备 hydration 数据
        const hydrationData = {
          props: pageProps,
          layoutPaths: clientLayoutPaths,
          pagePath: clientPagePath,
          params: match.params,
          errorPath: clientErrorPath,
          loadingPath: clientLoadingPath,
        };

        // 生成注入到 head 的脚本
        const metadataTags = metadata ? renderMetadataToHTML(metadata) : '';
        const viteScripts = getViteHMRScripts();

        // 生成 HTML 头部（只包含 DOCTYPE 和注入脚本的占位）
        const htmlHead = `<!DOCTYPE html>`;

        // 生成 HTML 尾部（hydration 脚本）
        const hydrationScript = generateHydrationScript(hydrationData);
        const clientScript = `<script type="module" src="/@lastjs/client"></script>`;

        // 需要注入到 head 的内容
        const headInjection = `${metadataTags}\n${viteScripts}`;

        // 需要注入到 body 末尾的内容
        const bodyInjection = `${hydrationScript}\n${clientScript}`;

        // 用于在流式输出中注入内容
        let headInjected = false;
        let bodyInjected = false;

        // 设置响应头 - 流式传输需要的头
        setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
        setResponseHeader(event, 'Transfer-Encoding', 'chunked');
        setResponseHeader(event, 'X-Content-Type-Options', 'nosniff');

        // 获取原始响应对象
        const res = event.node.res;

        // 禁用 Node.js 的响应缓冲
        res.flushHeaders();

        // 创建一个 Transform 流来注入内容
        const { Transform } = await import('node:stream');
        const injectStream = new Transform({
          transform(chunk: Buffer, _encoding, callback) {
            let html = chunk.toString();

            // 注入到 </head> 之前
            if (!headInjected && html.includes('</head>')) {
              html = html.replace('</head>', `${headInjection}</head>`);
              headInjected = true;
            }

            // 注入到 </body> 之前
            if (!bodyInjected && html.includes('</body>')) {
              html = html.replace('</body>', `${bodyInjection}</body>`);
              bodyInjected = true;
            }

            callback(null, html);
          },
        });

        // 先发送 DOCTYPE
        res.write(htmlHead);

        // 将转换后的内容发送到响应
        injectStream.pipe(res);

        // 使用流式渲染
        const stream = renderToStream(layouts, Page, pageProps, {
          Loading,
          ErrorComponent,
          ErrorBoundary,
          onShellReady() {
            // Shell 准备好后，开始流式传输
            stream.pipe(injectStream);
          },
          onShellError(error) {
            // Shell 渲染失败，发送错误页面
            console.error('Shell render error:', error);
            res.statusCode = 500;
            res.end(generateErrorHTML(error));
          },
          onError(error) {
            console.error('Streaming render error:', error);
          },
        });

        // 返回 undefined 表示我们已经手动处理了响应
        return;
      } catch (error) {
        // 检查是否为 notFound() 抛出的错误
        if (isNotFoundError(error)) {
          const notFoundPath = router.getNotFoundPath();
          const rootLayoutPath = router.getRootLayoutPath();

          if (notFoundPath) {
            try {
              const notFoundMod = await vite.ssrLoadModule(notFoundPath);
              const NotFound = notFoundMod.default;

              const layouts: LayoutComponent[] = [];
              if (rootLayoutPath) {
                const layoutMod = await vite.ssrLoadModule(rootLayoutPath);
                layouts.push(layoutMod.default || layoutMod);
              }

              const content = renderWithLayouts(layouts, NotFound, {});
              const metadata: Metadata = notFoundMod.metadata || {
                title: '404 - Page Not Found',
              };

              const html = wrapWithDoctype(content, {
                viteScripts: getViteHMRScripts(),
                metadata,
              });

              setResponseHeader(
                event,
                'Content-Type',
                'text/html; charset=utf-8'
              );
              event.node.res.statusCode = 404;
              return html;
            } catch (notFoundError) {
              console.error('Failed to render not-found page:', notFoundError);
            }
          }

          // 回退到默认 404
          setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
          event.node.res.statusCode = 404;
          return generate404HTML(url.pathname);
        }

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
