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
} from 'h3';
import { createServer } from 'node:http';

export interface StartCommandOptions {
  port: number;
}

/**
 * 启动生产服务器 (RSC 模式)
 */
export async function start(options: StartCommandOptions): Promise<void> {
  const { port } = options;
  const rootDir = process.cwd();
  const outDir = join(rootDir, '.lastjs');
  const clientDir = join(outDir, 'client');
  const rscDir = join(outDir, 'rsc');

  console.log(pc.cyan('🚀 Starting Last.js production server (RSC mode)...\n'));

  // 检查构建产物是否存在
  if (!existsSync(outDir)) {
    console.error(pc.red('✗ Build output not found.'));
    console.error(pc.dim('  Run `lastjs build` first.\n'));
    process.exit(1);
  }

  try {
    // 1. 加载 RSC handler
    console.log(pc.dim('  Loading RSC handler...'));

    const rscIndexPath = join(rscDir, 'index.js');
    if (!existsSync(rscIndexPath)) {
      console.error(pc.red('✗ RSC build output not found.'));
      console.error(pc.dim('  Run `lastjs build` first.\n'));
      process.exit(1);
    }

    const rscModule = await import(rscIndexPath);
    const rscHandler = rscModule.default;

    if (typeof rscHandler !== 'function') {
      console.error(pc.red('✗ RSC handler is not a function.'));
      process.exit(1);
    }

    // 2. 创建 h3 应用
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

    // 静态资源处理
    app.use(
      defineEventHandler(async (event) => {
        const url = getRequestURL(event);

        // 检查是否是静态资源请求
        if (
          url.pathname.startsWith('/assets/') ||
          url.pathname.match(
            /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/
          )
        ) {
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
        }

        // RSC/SSR 处理
        try {
          // 构建 Request 对象
          const headers = new Headers();
          for (const [key, value] of Object.entries(event.node.req.headers)) {
            if (value) {
              headers.set(key, Array.isArray(value) ? value[0] : value);
            }
          }

          const request = new Request(url.toString(), {
            method: event.node.req.method || 'GET',
            headers,
          });

          // 调用 RSC handler
          const response = await rscHandler(request);

          // 设置响应状态和头
          event.node.res.statusCode = response.status;
          for (const [key, value] of response.headers.entries()) {
            setResponseHeader(event, key, value);
          }

          // 返回响应体
          const body = await response.text();
          return body;
        } catch (error) {
          console.error('Server error:', error);
          event.node.res.statusCode = 500;
          setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
          return generateErrorHTML(error);
        }
      })
    );

    // 3. 启动服务器
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
