import { defineEventHandler, getRequestURL } from 'h3';
import { FileSystemRouter } from '@lastjs/core/router';
import { renderPage } from '@lastjs/core/render';
import { join } from 'pathe';

// 全局路由器实例（开发模式下会热重载）
let router: FileSystemRouter | null = null;
let appDir: string;

async function getRouter() {
  if (!router) {
    appDir = join(process.cwd(), 'app');
    router = new FileSystemRouter(appDir);
    await router.scan();
  }
  return router;
}

export default defineEventHandler(async (event) => {
  try {
    const url = getRequestURL(event);
    const router = await getRouter();

    // 匹配路由
    const match = router.match(url.pathname);

    if (!match) {
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // 渲染页面
    const html = await renderPage(match, {
      params: match.params,
      searchParams: Object.fromEntries(url.searchParams),
    });

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Request handler error:', error);

    return new Response(
      `Internal Server Error\n\n${error instanceof Error ? error.message : String(error)}`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      }
    );
  }
}) as any;
