import { join } from 'pathe';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import {
  createApp,
  defineEventHandler,
  getRequestURL,
  setResponseHeader,
  toNodeListener,
  serveStatic,
} from 'h3';
import { createServer } from 'node:http';
import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

export interface StartCommandOptions {
  port: number;
}

interface BuildManifest {
  routes: Array<{
    path: string;
    pagePath: string;
    layoutPaths: string[];
  }>;
  clientEntry: string;
}

interface RouteInfo {
  pattern: RegExp;
  paramNames: string[];
  pagePath: string;
  layoutPaths: string[];
}

/**
 * 启动生产服务器
 */
export async function start(options: StartCommandOptions): Promise<void> {
  const { port } = options;
  const rootDir = process.cwd();
  const outDir = join(rootDir, '.lastjs');
  const clientDir = join(outDir, 'client');
  const serverDir = join(outDir, 'server');

  console.log(pc.cyan('🚀 Starting Last.js production server...\n'));

  // 检查构建产物是否存在
  if (!existsSync(outDir)) {
    console.error(pc.red('✗ Build output not found.'));
    console.error(pc.dim('  Run `lastjs build` first.\n'));
    process.exit(1);
  }

  try {
    // 1. 读取 manifest
    const manifestPath = join(outDir, 'manifest.json');
    if (!existsSync(manifestPath)) {
      console.error(pc.red('✗ Build manifest not found.'));
      console.error(pc.dim('  Run `lastjs build` first.\n'));
      process.exit(1);
    }

    const manifest: BuildManifest = JSON.parse(
      await readFile(manifestPath, 'utf-8')
    );

    // 2. 解析路由
    const routes: RouteInfo[] = manifest.routes.map((route) => {
      const { pattern, paramNames } = pathToRegex(route.path);
      return {
        pattern,
        paramNames,
        pagePath: route.pagePath,
        layoutPaths: route.layoutPaths,
      };
    });

    // 3. 预加载所有服务端模块
    console.log(pc.dim('  Loading server modules...'));
    const moduleCache = new Map<
      string,
      { default: React.ComponentType<Record<string, unknown>> }
    >();

    // 将路径中的 [param] 转换为 _param_（Vite 构建时的转换）
    const toServerPath = (srcPath: string): string => {
      return srcPath
        .replace(/\[\.\.\.([^\]]+)\]/g, '___$1_') // [...slug] -> ___slug_
        .replace(/\[([^\]]+)\]/g, '_$1_') // [slug] -> _slug_
        .replace(/\.tsx?$/, '.js');
    };

    for (const route of routes) {
      // 加载 page
      const pageModulePath = join(serverDir, toServerPath(route.pagePath));
      if (existsSync(pageModulePath)) {
        moduleCache.set(route.pagePath, await import(pageModulePath));
      }

      // 加载 layouts
      for (const layoutPath of route.layoutPaths) {
        if (!moduleCache.has(layoutPath)) {
          const layoutModulePath = join(serverDir, toServerPath(layoutPath));
          if (existsSync(layoutModulePath)) {
            moduleCache.set(layoutPath, await import(layoutModulePath));
          }
        }
      }
    }

    // 4. 创建 h3 应用
    const app = createApp();

    // MIME 类型映射
    const mimeTypes: Record<string, string> = {
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
    };

    // 静态资源处理 - 处理 /assets/ 路径
    app.use(
      '/assets',
      defineEventHandler(async (event) => {
        const filePath = 'assets' + event.path;
        return serveStatic(event, {
          getContents: async () => {
            const fullPath = join(clientDir, filePath);
            if (existsSync(fullPath)) {
              return readFile(fullPath);
            }
            return undefined;
          },
          getMeta: async () => {
            const fullPath = join(clientDir, filePath);
            if (existsSync(fullPath)) {
              const ext = filePath.split('.').pop() || '';
              return {
                type: mimeTypes[ext] || 'application/octet-stream',
              };
            }
            return undefined;
          },
        });
      })
    );

    // 页面处理
    app.use(
      defineEventHandler(async (event) => {
        const url = getRequestURL(event);

        // 跳过静态资源
        if (
          url.pathname.match(
            /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/
          )
        ) {
          // 尝试从 client 目录提供
          const filePath = join(clientDir, url.pathname);
          if (existsSync(filePath)) {
            const content = await readFile(filePath);
            const ext = url.pathname.split('.').pop() || '';
            setResponseHeader(
              event,
              'Content-Type',
              mimeTypes[ext] || 'application/octet-stream'
            );
            return content;
          }
          return;
        }

        try {
          // 匹配路由
          const match = matchRoute(url.pathname, routes);

          if (!match) {
            setResponseHeader(
              event,
              'Content-Type',
              'text/html; charset=utf-8'
            );
            return generate404HTML(url.pathname);
          }

          // 加载组件
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const layouts: React.ComponentType<any>[] = [];
          for (const layoutPath of match.route.layoutPaths) {
            const mod = moduleCache.get(layoutPath);
            if (mod) {
              layouts.push(mod.default);
            }
          }

          const pageMod = moduleCache.get(match.route.pagePath);
          if (!pageMod) {
            throw new Error(`Page module not found: ${match.route.pagePath}`);
          }
          const Page = pageMod.default;

          // 渲染
          const props = { params: match.params };
          let element: React.ReactElement = React.createElement(Page, props);

          for (let i = layouts.length - 1; i >= 0; i--) {
            const Layout = layouts[i];
            element = React.createElement(Layout, { children: element });
          }

          const content = ReactDOMServer.renderToString(element);

          // 生成 HTML - layoutPaths 和 pagePath 使用相对于项目根的路径
          // 客户端入口会通过组件注册表来查找
          const html = wrapWithHTML(content, {
            clientEntry: '/' + manifest.clientEntry,
            hydrationData: {
              props,
              layoutPaths: match.route.layoutPaths,
              pagePath: match.route.pagePath,
            },
          });

          setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
          return html;
        } catch (error) {
          console.error('Request handler error:', error);
          setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
          return generateErrorHTML(error);
        }
      })
    );

    // 5. 启动服务器
    const server = createServer(toNodeListener(app));

    await new Promise<void>((resolve) => {
      server.listen(port, () => resolve());
    });

    console.log(
      pc.green(`✓ Server ready on ${pc.bold(`http://localhost:${port}`)}\n`)
    );

    // 监听退出信号
    const cleanup = () => {
      console.log(pc.yellow('\n⏳ Shutting down...'));
      server.close();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (error) {
    console.error(pc.red('\n✗ Failed to start server:\n'));
    console.error(error);
    process.exit(1);
  }
}

/**
 * 将路径模式转换为正则表达式
 */
function pathToRegex(path: string): { pattern: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];

  // 使用占位符来保护捕获组
  let patternStr = path;

  // 处理 catch-all [...param]
  patternStr = patternStr.replace(/\[\.\.\.([^\]]+)\]/g, (_, name) => {
    paramNames.push(name);
    return '__CATCHALL__';
  });

  // 处理动态路由 [param]
  patternStr = patternStr.replace(/\[([^\]]+)\]/g, (_, name) => {
    paramNames.push(name);
    return '__DYNAMIC__';
  });

  // 转义特殊字符
  patternStr = patternStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 恢复捕获组
  patternStr = patternStr.replace(/__CATCHALL__/g, '(.+)');
  patternStr = patternStr.replace(/__DYNAMIC__/g, '([^/]+)');

  return {
    pattern: new RegExp(`^${patternStr}$`),
    paramNames,
  };
}

/**
 * 匹配路由
 */
function matchRoute(
  pathname: string,
  routes: RouteInfo[]
): { route: RouteInfo; params: Record<string, string> } | null {
  const normalizedPath =
    pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';

  for (const route of routes) {
    const match = normalizedPath.match(route.pattern);
    if (match) {
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      return { route, params };
    }
  }

  return null;
}

/**
 * 包装为 HTML
 */
function wrapWithHTML(
  content: string,
  options: {
    clientEntry: string;
    hydrationData: {
      props: Record<string, unknown>;
      layoutPaths: string[];
      pagePath: string;
    };
  }
): string {
  const { clientEntry, hydrationData } = options;

  const hydrationScript = `<script>window.__LASTJS_DATA__=${JSON.stringify(
    hydrationData
  )
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')};</script>`;

  // 如果内容已经是完整的 HTML 文档
  if (content.includes('<html')) {
    let result = content;

    // 用 <div id="__lastjs"> 包裹 body 内容
    result = result.replace(
      /(<body[^>]*>)([\s\S]*?)(<\/body>)/,
      `$1<div id="__lastjs">$2</div>${hydrationScript}<script type="module" src="${clientEntry}"></script>$3`
    );

    return `<!DOCTYPE html>${result}`;
  }

  // 默认模板
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Last.js App</title>
  </head>
  <body>
    <div id="__lastjs">${content}</div>
    ${hydrationScript}
    <script type="module" src="${clientEntry}"></script>
  </body>
</html>`;
}

/**
 * 生成 404 页面
 */
function generate404HTML(pathname: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>404 - Not Found</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        background: #fafafa;
      }
      h1 { color: #333; }
      p { color: #666; }
      a { color: #0070f3; }
    </style>
  </head>
  <body>
    <h1>404 - Not Found</h1>
    <p>Path: ${pathname}</p>
    <p><a href="/">Go to Home</a></p>
  </body>
</html>`;
}

/**
 * 生成错误页面
 */
function generateErrorHTML(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return `<!DOCTYPE html>
<html>
  <head>
    <title>500 - Server Error</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 800px;
        margin: 50px auto;
        padding: 20px;
      }
      h1 { color: #e00; }
      pre {
        background: #f5f5f5;
        padding: 20px;
        overflow: auto;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <h1>500 - Internal Server Error</h1>
    <pre>${message}</pre>
  </body>
</html>`;
}
