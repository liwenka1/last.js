// RSC Entry - Waku-style lightweight wrapper
// 延迟初始化：不在顶层执行任何初始化

/**
 * Default export: Request Handler (官方标准 Web API)
 * 
 * 关键：延迟加载所有依赖，避免在 import 时卡住
 */
export default async function handler(request: Request): Promise<Response> {
  // ✅ 延迟导入，避免顶层初始化
  const { renderToReadableStream } = await import('@vitejs/plugin-rsc/rsc');
  const { FileSystemRouter } = await import('../router/fs-router.js');
  const { createElement } = await import('react');
  
  // ✅ 延迟创建路由器
  const appDir = process.env.APP_DIR || 'app';
  const router = new FileSystemRouter(appDir);
  await router.scan();
  
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // 1. 匹配路由
    const match = router.match(pathname);
    if (!match) {
      // 404
      const notFoundPath = router.getNotFoundPath();
      if (notFoundPath) {
        const notFoundModule = await import.meta.viteRsc.loadModule('rsc', notFoundPath);
        const NotFoundComponent = notFoundModule.default;
        const element = createElement(NotFoundComponent);
        
        const rscStream = renderToReadableStream(element);
        
        // 如果是 RSC 请求，直接返回 RSC Stream
        if (request.headers.get('accept') === 'text/x-component' || url.searchParams.has('_rsc')) {
          return new Response(rscStream, {
            status: 404,
            headers: { 'Content-Type': 'text/x-component' },
          });
        }
        
        // HTML 请求：调用 SSR
        const ssrEntry = await import.meta.viteRsc.loadModule<
          typeof import('./entry.ssr.js')
        >('ssr', 'index');
        const htmlStream = await ssrEntry.handleSsr(rscStream);
        
        return new Response(htmlStream, {
          status: 404,
          headers: { 'Content-Type': 'text/html' },
        });
      }
      
      return new Response('Not Found', { status: 404 });
    }
    
    // 2. 加载页面组件
    const pageModule = await import.meta.viteRsc.loadModule('rsc', match.filePath);
    const PageComponent = pageModule.default;
    
    if (!PageComponent) {
      throw new Error(`No default export found in ${match.filePath}`);
    }
    
    // 3. 加载 layouts
    const layoutPaths = router.getLayoutPaths(pathname);
    let LayoutComponent = ({ children }: any) => children;
    
    if (layoutPaths && layoutPaths.length > 0) {
      for (const layoutPath of layoutPaths) {
        try {
          const layoutModule = await import.meta.viteRsc.loadModule('rsc', layoutPath);
          const CurrentLayout = layoutModule.default;
          
          if (CurrentLayout) {
            const PrevLayout = LayoutComponent;
            LayoutComponent = ({ children }: any) => 
              createElement(CurrentLayout, null, 
                createElement(PrevLayout, null, children)
              );
          }
        } catch (err) {
          console.warn(`[RSC] Failed to load layout ${layoutPath}:`, err);
        }
      }
    }
    
    // 4. 构建 React 树
    const element = createElement(
      LayoutComponent,
      null,
      createElement(PageComponent, { 
        params: match.params,
        searchParams: Object.fromEntries(url.searchParams)
      })
    );
    
    // 5. 渲染为 RSC Stream
    const rscStream = renderToReadableStream(element, {
      onError(error: Error) {
        console.error('[RSC] Stream error:', error);
      },
    });
    
    // 6. RSC 请求：直接返回 RSC Stream
    if (request.headers.get('accept') === 'text/x-component' || url.searchParams.has('_rsc')) {
      return new Response(rscStream, {
        status: 200,
        headers: { 'Content-Type': 'text/x-component' },
      });
    }
    
    // 7. HTML 请求：调用 SSR Entry（✅ 官方方式）
    const ssrEntry = await import.meta.viteRsc.loadModule<
      typeof import('./entry.ssr.js')
    >('ssr', 'index');
    const ssrResult = await ssrEntry.renderHTML(rscStream, {});
    
    return new Response(ssrResult.stream, {
      status: ssrResult.status || 200,
      headers: { 'Content-Type': 'text/html' },
    });
    
  } catch (error) {
    console.error('[RSC] Error:', error);
    
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body>
        <h1>Server Error</h1>
        <pre>${error instanceof Error ? error.stack : String(error)}</pre>
      </body>
      </html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

// ✅ Server Actions 处理器（保留，供外部调用）
export async function handleServerAction(actionId: string, args: unknown[]) {
  const { loadServerAction } = await import('@vitejs/plugin-rsc/rsc');
  try {
    const action = await loadServerAction(actionId);
    return await action(...args);
  } catch (error) {
    console.error('[RSC] Server Action error:', error);
    throw error;
  }
}

// ✅ HMR Support（官方推荐）
if (import.meta.hot) {
  import.meta.hot.accept();
}
