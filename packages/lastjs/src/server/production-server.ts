/**
 * Production Server
 *
 * 生产环境服务器，支持：
 * - SSR 渲染
 * - 路由匹配
 * - Server Actions
 * - API Routes
 * - 静态资源
 */

import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'pathe';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { ReactNode, ComponentType } from 'react';
import { FileSystemRouter } from '../router/fs-router.js';
import type { Metadata, RouteModule } from '../router/types.js';
import { actionsRegistry } from './actions-registry.js';
import { handleServerAction } from './actions-handler.js';
import type { ActionRequest, ActionResponse } from './actions-handler.js';
import {
  wrapWithDoctype,
  generate404HTML,
  generateErrorHTML,
  renderWithLayouts,
  renderToStream,
  generateHydrationScript,
  renderMetadataToHTML,
} from '../render/index.js';
import { isNotFoundError } from '../navigation/index.js';
import { ApiRouter } from './api-router.js';

/**
 * Vite Client Manifest Entry
 */
interface ClientManifestEntry {
  file: string;
  isEntry?: boolean;
  imports?: string[];
  css?: string[];
}

/**
 * MIME 类型映射
 */
const MIME_TYPES: Record<string, string> = {
  js: 'application/javascript',
  mjs: 'application/javascript',
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
  webp: 'image/webp',
  avif: 'image/avif',
  webm: 'video/webm',
  mp4: 'video/mp4',
};

/**
 * 将文件路径转换为构建输出的模块ID
 */
function filePathToModuleId(filePath: string, buildDir: string): string {
  // 从绝对路径中提取相对于项目根的路径
  // 例如: /path/to/project/app/page.tsx -> app/page.tsx
  const parts = filePath.split('/');
  const appIndex = parts.lastIndexOf('app');
  if (appIndex === -1) {
    throw new Error(`Invalid file path: ${filePath}`);
  }
  const relativePath = parts.slice(appIndex).join('/');
  // 转换为构建输出的模块名：
  // app/page.tsx -> app_page.js
  // app/blog/[slug]/page.tsx -> app_blog__slug__page.js
  // 需要匹配 Vite 的行为：_[slug]_ -> __slug__（不是 ___slug___）
  let moduleName = relativePath
    .replace(/\//g, '_') // 斜杠转下划线: app_blog_[slug]_page.tsx
    .replace(/_\[([^\]]+)\]_/g, '__$1__') // _[xxx]_ 转 __xxx__: app_blog__slug__page.tsx
    .replace(/\[([^\]]+)\]/g, '__$1__') // [xxx] 转 __xxx__（处理边界情况）
    .replace(/\.(tsx?|jsx?)$/, '.js'); // 扩展名改为 .js
  // 返回绝对路径，使用 pathToFileURL 确保正确的 file:// URL 格式
  const absolutePath = join(buildDir, 'server', moduleName);
  return pathToFileURL(absolutePath).href;
}

export interface ProductionServerOptions {
  /** 构建输出目录 */
  buildDir: string;
  /** app 目录路径（用于路由） */
  appDir: string;
  /** 端口号 */
  port?: number;
}

interface LayoutComponent {
  (props: { children: ReactNode }): ReactNode;
}

interface PageComponent {
  (props: Record<string, unknown>): ReactNode;
}

/**
 * 启动生产服务器
 */
export async function startProductionServer(
  options: ProductionServerOptions
): Promise<void> {
  const { buildDir, appDir, port = 3000 } = options;

  console.log('\n🚀 Starting Last.js production server...\n');

  // 初始化路由器
  const router = new FileSystemRouter(appDir);
  await router.scan();

  // 初始化 API 路由器
  const apiRouter = new ApiRouter(appDir);
  await apiRouter.scan();

  // 注册 Server Actions
  console.log('🔍 Scanning Server Actions...');
  await scanAndRegisterProductionActions(appDir, buildDir);
  console.log(
    `✅ Registered ${actionsRegistry.getAll().size} Server Actions\n`
  );

  // 读取客户端 manifest
  let clientManifest: Record<string, { file: string; isEntry?: boolean }> = {};
  const manifestPath = join(buildDir, 'client/.vite/manifest.json');
  if (existsSync(manifestPath)) {
    const manifestContent = await readFile(manifestPath, 'utf-8');
    clientManifest = JSON.parse(manifestContent);
  }

  // 获取客户端入口脚本
  function getClientScripts(): string[] {
    const scripts: string[] = [];
    // 只返回主客户端入口脚本（虚拟模块 @lastjs/client）
    // app 文件应该通过动态导入加载，而不是作为独立的 script 标签
    for (const [key, value] of Object.entries(clientManifest)) {
      if (value.isEntry && key.includes('@lastjs/client')) {
        // value.file 已经包含了 assets/ 前缀，直接加 / 即可
        scripts.push(`/${value.file}`);
      }
    }
    return scripts;
  }

  const clientScripts = getClientScripts();

  // 创建 HTTP 服务器
  const server = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);

      try {
        // 1. 静态文件处理
        if (
          url.pathname.startsWith('/assets/') ||
          url.pathname.match(
            /\.(js|mjs|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|avif|webm|mp4)$/
          )
        ) {
          await handleStaticFile(url.pathname, buildDir, res);
          return;
        }

        // 2. Server Actions 处理
        if (url.pathname === '/_actions') {
          await handleServerActions(req, res);
          return;
        }

        // 4. API 路由处理
        if (url.pathname.startsWith('/api/')) {
          await handleApiRoute(req, res, url, apiRouter, buildDir);
          return;
        }

        // 5. 页面渲染 (SSR)
        await handlePageRender(
          req,
          res,
          url,
          router,
          buildDir,
          appDir,
          clientScripts,
          clientManifest
        );
      } catch (error) {
        console.error('Server error:', error);
        await handleError(res, error);
      }
    }
  );

  // 启动服务器
  server.listen(port, () => {
    console.log(
      `\n🚀 Last.js production server running on http://localhost:${port}\n`
    );
  });

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n⏳ Shutting down...');
    server.close(() => {
      console.log('✓ Server closed');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}

/**
 * 处理静态文件
 */
async function handleStaticFile(
  pathname: string,
  buildDir: string,
  res: ServerResponse
): Promise<void> {
  const filePath = join(buildDir, 'client', pathname);

  if (!existsSync(filePath)) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  try {
    const content = await readFile(filePath);
    const ext = pathname.split('.').pop() || '';
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.end(content);
  } catch (error) {
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}

/**
 * 处理 Server Actions 请求
 */
async function handleServerActions(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // 只接受 POST 请求
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
    return;
  }

  try {
    // 读取请求体
    const body = await new Promise<string>((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk.toString();
      });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    const actionRequest: ActionRequest = JSON.parse(body);

    console.log(`[Server Actions] Handling action: ${actionRequest.actionId}`);

    // 使用 actions-handler 中的逻辑处理
    const result = await handleServerAction(actionRequest);

    // 返回结果
    res.statusCode = result.success
      ? 200
      : result.error?.includes('not found')
        ? 404
        : 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('[Server Actions] Error:', error);
    const response: ActionResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response));
  }
}

/**
 * 处理 API 路由
 */
async function handleApiRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  apiRouter: ApiRouter,
  buildDir: string
): Promise<void> {
  const method = req.method || 'GET';

  // 匹配 API 路由
  const match = apiRouter.match(url.pathname, method);

  if (!match) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: `API route not found: ${url.pathname}`,
      })
    );
    return;
  }

  try {
    // 动态导入 API 处理器（从构建的服务端代码）
    const moduleId = filePathToModuleId(match.route.filePath, buildDir);
    const mod = await import(moduleId);
    const handler = mod[method];

    if (typeof handler !== 'function') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: `Method ${method} not allowed for ${url.pathname}`,
        })
      );
      return;
    }

    // 构建完整 URL
    const fullUrl = `${url.protocol}//${url.host}${url.pathname}${url.search}`;

    // 构建 Request 对象
    const requestInit: RequestInit = {
      method,
      headers: new Headers(req.headers as HeadersInit),
    };

    // 对于有 body 的请求，需要读取 body
    if (method !== 'GET' && method !== 'HEAD') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      requestInit.body = buffer;
    }

    const request = new Request(fullUrl, requestInit);

    // 调用处理器
    const response: Response = await handler(request, {
      params: match.params,
    });

    // 转换 Response 到 Node.js response
    res.statusCode = response.status;

    // 设置响应头
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // 发送响应体
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }

    res.end();
  } catch (error) {
    console.error('[API Route] Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );
  }
}

/**
 * 处理页面渲染 (SSR)
 */
async function handlePageRender(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  router: FileSystemRouter,
  buildDir: string,
  appDir: string,
  clientScripts: string[],
  clientManifest: Record<string, any>
): Promise<void> {
  try {
    // 匹配路由
    const match = router.match(url.pathname);

    if (!match) {
      // 404 页面
      const notFoundPath = router.getNotFoundPath();
      if (notFoundPath) {
        await renderNotFoundPage(res, notFoundPath, buildDir, clientScripts);
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(generate404HTML(url.pathname));
      }
      return;
    }

    // 检查是否为客户端导航
    const isClientNavigation = req.headers['x-lastjs-navigation'] === 'true';

    if (isClientNavigation) {
      // 客户端导航：返回 JSON 数据
      await handleClientNavigation(
        res,
        match,
        url,
        router,
        buildDir,
        appDir,
        clientManifest
      );
      return;
    }

    // 服务端渲染：返回完整 HTML
    await renderFullPage(
      res,
      match,
      url,
      router,
      buildDir,
      appDir,
      clientScripts,
      clientManifest
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      // 自定义 404 错误
      const notFoundPath = router.getNotFoundPath();
      if (notFoundPath) {
        await renderNotFoundPage(res, notFoundPath, buildDir, clientScripts);
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(generate404HTML(url.pathname));
      }
      return;
    }

    throw error;
  }
}

/**
 * 渲染 404 页面
 */
async function renderNotFoundPage(
  res: ServerResponse,
  notFoundPath: string,
  buildDir: string,
  clientScripts: string[]
): Promise<void> {
  try {
    const moduleId = filePathToModuleId(notFoundPath, buildDir);
    const mod = await import(moduleId);
    const NotFoundPage: PageComponent = mod.default;

    if (!NotFoundPage) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(generate404HTML('/'));
      return;
    }

    // 渲染 404 页面
    const content = renderWithLayouts([], NotFoundPage, {});
    const html = wrapWithDoctype(content, {
      metadata: { title: '404 - Page Not Found' },
      clientScripts,
    });

    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  } catch (error) {
    console.error('Error rendering 404 page:', error);
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(generate404HTML('/'));
  }
}

/**
 * 处理客户端导航
 */
async function handleClientNavigation(
  res: ServerResponse,
  match: ReturnType<FileSystemRouter['match']>,
  url: URL,
  router: FileSystemRouter,
  buildDir: string,
  appDir: string,
  clientManifest: Record<string, ClientManifestEntry>
): Promise<void> {
  if (!match) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not Found' }));
    return;
  }

  try {
    // 加载页面模块
    const moduleId = filePathToModuleId(match.filePath, buildDir);
    const pageMod: RouteModule = await import(moduleId);

    // 获取 metadata
    let metadata: Metadata | undefined;
    if (pageMod.generateMetadata) {
      metadata = await pageMod.generateMetadata({
        params: match.params,
        searchParams: Object.fromEntries(url.searchParams),
      });
    } else if (pageMod.metadata) {
      metadata = pageMod.metadata;
    }

    // 获取 layout 路径（客户端路径格式）
    const layoutPaths = router
      .getLayoutChain(match.node)
      .map((l) => l.replace(appDir, '/app').replace(/\\/g, '/'));

    const pagePath = match.filePath.replace(appDir, '/app').replace(/\\/g, '/');

    // 获取 props
    const pageProps = {
      params: match.params,
      searchParams: Object.fromEntries(url.searchParams),
    };

    // 创建模块映射：从源路径到构建后的文件路径
    const moduleMap: Record<string, string> = {};
    for (const key in clientManifest) {
      if (key.startsWith('app/')) {
        const srcPath = `/${key.replace(/\.(tsx?|jsx?)$/, '')}`;
        moduleMap[srcPath] = `/assets/${clientManifest[key].file}`;
      }
    }

    console.log('[Production] Client navigation moduleMap:', moduleMap);
    console.log('[Production] Returning layouts:', layoutPaths);
    console.log('[Production] Returning pagePath:', pagePath);

    // 返回 JSON 数据（必须包含 moduleMap 以便客户端解析模块路径）
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        props: pageProps,
        layoutPaths,
        pagePath,
        params: match.params,
        metadata,
        moduleMap, // 关键！客户端需要这个来解析模块路径
      })
    );
  } catch (error) {
    console.error('Client navigation error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );
  }
}

/**
 * 渲染完整页面
 */
async function renderFullPage(
  res: ServerResponse,
  match: ReturnType<FileSystemRouter['match']>,
  url: URL,
  router: FileSystemRouter,
  buildDir: string,
  appDir: string,
  clientScripts: string[],
  clientManifest: Record<string, any>
): Promise<void> {
  if (!match) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(generate404HTML(url.pathname));
    return;
  }

  try {
    // 加载所有 layout 组件
    const layoutPaths = router.getLayoutChain(match.node);
    const layouts: LayoutComponent[] = [];

    console.log('[Production] Rendering page:', match.filePath);
    console.log('[Production] Layout paths:', layoutPaths);

    for (const layoutPath of layoutPaths) {
      const moduleId = filePathToModuleId(layoutPath, buildDir);
      console.log('[Production] Loading layout:', moduleId);
      const mod = await import(moduleId);
      layouts.push(mod.default || mod);
    }

    // 加载页面模块
    const moduleId = filePathToModuleId(match.filePath, buildDir);
    console.log('[Production] Loading page module:', moduleId);
    const pageMod: RouteModule = await import(moduleId);
    console.log('[Production] Page module keys:', Object.keys(pageMod));
    console.log(
      '[Production] Page module.default type:',
      typeof pageMod.default
    );

    const Page: PageComponent | undefined = pageMod.default as PageComponent;

    if (!Page) {
      throw new Error(`Page component not found: ${match.filePath}`);
    }
    console.log('[Production] Page component loaded, type:', typeof Page);

    // 获取 metadata
    let metadata: Metadata | undefined;
    if (pageMod.generateMetadata) {
      metadata = await pageMod.generateMetadata({
        params: match.params,
        searchParams: Object.fromEntries(url.searchParams),
      });
    } else if (pageMod.metadata) {
      metadata = pageMod.metadata;
    }

    // 准备 props
    const pageProps = {
      params: match.params,
      searchParams: Object.fromEntries(url.searchParams),
    };

    // 准备 hydration 数据
    const clientLayoutPaths = layoutPaths.map((l) =>
      l.replace(appDir, '/app').replace(/\\/g, '/')
    );
    const clientPagePath = match.filePath
      .replace(appDir, '/app')
      .replace(/\\/g, '/');

    // 创建模块映射：从源路径到构建后的文件路径
    const moduleMap: Record<string, string> = {};
    for (const [src, info] of Object.entries(clientManifest)) {
      if (info.isEntry && src.startsWith('app/')) {
        const srcPath = `/${src}`;
        // 去掉扩展名
        const pathWithoutExt = srcPath.replace(/\.(tsx?|jsx?)$/, '');
        moduleMap[pathWithoutExt] = `/${info.file}`;
      }
    }

    const hydrationData = {
      props: pageProps,
      layoutPaths: clientLayoutPaths,
      pagePath: clientPagePath,
      params: match.params,
      moduleMap, // 添加模块映射
    };

    // 加载 ErrorBoundary 组件
    const { ErrorBoundary } = await import('../client/error-boundary.js');

    // 渲染错误组件路径
    const errorPath = match.node ? router.getErrorPath(match.node) : undefined;
    let ErrorComponent:
      | ComponentType<{ error: Error; reset: () => void }>
      | undefined;

    if (errorPath) {
      const errorModuleId = filePathToModuleId(errorPath, buildDir);
      console.log('[Production] Loading error component:', errorModuleId);
      const errorMod = await import(errorModuleId);
      ErrorComponent = errorMod.default;
    }

    // 使用流式渲染
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    // 准备注入内容
    const metadataHTML = metadata ? renderMetadataToHTML(metadata) : '';
    const scriptTags = clientScripts
      .map((src) => `<script type="module" src="${src}"></script>`)
      .join('\n');

    const headInjection = `${metadataHTML}\n${scriptTags}`;
    const bodyInjection = generateHydrationScript(hydrationData);

    let headInjected = false;
    let bodyInjected = false;

    // 创建 Transform 流来注入内容
    const { Transform } = await import('node:stream');
    const injectStream = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        let html = chunk.toString();

        // 注入到 </head> 之前
        if (!headInjected && html.includes('</head>')) {
          html = html.replace('</head>', `${headInjection}\n</head>`);
          headInjected = true;
        }

        // 注入到 </body> 之前
        if (!bodyInjected && html.includes('</body>')) {
          html = html.replace('</body>', `${bodyInjection}\n</body>`);
          bodyInjected = true;
        }

        callback(null, html);
      },
    });

    // 连接流：injectStream -> res
    injectStream.pipe(res);

    // 渲染流
    const stream = renderToStream(layouts, Page, pageProps, {
      ErrorComponent,
      ErrorBoundary,
      onShellReady() {
        // Shell 准备好后，连接 React 流到注入流
        stream.pipe(injectStream);
      },
      onShellError(error) {
        console.error('[Production] Shell render error:', error);
        res.statusCode = 500;
        res.end(generateErrorHTML(error));
      },
      onError(error) {
        console.error('[Production] Stream error:', error);
      },
    });
  } catch (error) {
    console.error('Page render error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(
      wrapWithDoctype(
        generateErrorHTML(
          error instanceof Error ? error : new Error('Unknown error')
        )
      )
    );
  }
}

/**
 * 处理错误
 */
async function handleError(res: ServerResponse, error: unknown): Promise<void> {
  console.error('Server error:', error);
  res.statusCode = 500;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(
    wrapWithDoctype(
      generateErrorHTML(
        error instanceof Error ? error : new Error('Unknown error')
      )
    )
  );
}

/**
 * 扫描并注册生产环境的 Server Actions
 */
async function scanAndRegisterProductionActions(
  appDir: string,
  buildDir: string
): Promise<void> {
  const { readdir, readFile: fsReadFile } = await import('node:fs/promises');
  const { relative: pathRelative } = await import('pathe');

  actionsRegistry.clear();

  // 递归扫描目录
  async function scanDir(dir: string): Promise<string[]> {
    const files: string[] = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await scanDir(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // 忽略错误
    }

    return files;
  }

  // 检查是否包含 'use server' 指令
  function hasUseServerDirective(content: string): boolean {
    const lines = content.split('\n').slice(0, 10);

    for (const line of lines) {
      const trimmed = line.trim();

      if (
        !trimmed ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed === '*/' ||
        trimmed.startsWith('*')
      ) {
        continue;
      }

      if (
        trimmed === "'use server'" ||
        trimmed === '"use server"' ||
        trimmed === '`use server`' ||
        trimmed === "'use server';" ||
        trimmed === '"use server";' ||
        trimmed === '`use server`;'
      ) {
        return true;
      }

      if (trimmed && !trimmed.startsWith('import')) {
        break;
      }
    }

    return false;
  }

  // 检查是否是特殊导出
  function isSpecialExport(exportName: string): boolean {
    const specialExports = [
      'metadata',
      'generateMetadata',
      'generateStaticParams',
      'dynamic',
      'revalidate',
      'fetchCache',
      'runtime',
      'preferredRegion',
    ];

    return specialExports.includes(exportName);
  }

  // 扫描所有文件
  const files = await scanDir(appDir);

  let actionCount = 0;

  for (const filePath of files) {
    if (!/\.(tsx?|jsx?)$/.test(filePath)) {
      continue;
    }

    try {
      // 读取文件内容检查 'use server'
      const content = await fsReadFile(filePath, 'utf-8');

      if (!hasUseServerDirective(content)) {
        continue;
      }

      // 加载模块（从构建输出）
      // 使用 filePathToModuleId 转换路径，确保正确处理动态路由和文件名转换
      const moduleId = filePathToModuleId(filePath, buildDir);

      const mod = await import(moduleId);

      const relativeToApp = pathRelative(appDir, filePath);

      // 注册所有导出的函数
      for (const [exportName, exportValue] of Object.entries(mod)) {
        if (exportName === 'default' || typeof exportValue !== 'function') {
          continue;
        }

        if (isSpecialExport(exportName)) {
          continue;
        }

        // 生成 action ID
        const actionId = `${relativeToApp}:${exportName}`;

        // 注册 action
        actionsRegistry.register({
          fn: exportValue as (...args: unknown[]) => Promise<unknown>,
          filePath,
          functionName: exportName,
          id: actionId,
        });

        actionCount++;
        console.log(`  ✅ ${actionId}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.warn(`  ⚠ Failed to load ${filePath}:`, errorMessage);
    }
  }
}
