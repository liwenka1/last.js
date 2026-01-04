/**
 * Nitro 运行时处理器
 * 这个文件会被复制到 .lastjs 目录
 */

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);

  // 简单的静态 HTML 响应（MVP 版本）
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Last.js MVP</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 800px;
        margin: 50px auto;
        padding: 20px;
        line-height: 1.6;
      }
      h1 { color: #0070f3; }
      code {
        background: #f4f4f4;
        padding: 2px 6px;
        border-radius: 3px;
      }
      .success { color: #0070f3; }
    </style>
  </head>
  <body>
    <h1>🎉 Last.js MVP 成功运行！</h1>
    <p class="success">✓ 开发服务器已启动</p>
    <p class="success">✓ Nitro 集成成功</p>
    <p class="success">✓ 路由匹配工作正常</p>
    
    <h2>当前请求信息</h2>
    <ul>
      <li><strong>路径:</strong> <code>${url.pathname}</code></li>
      <li><strong>方法:</strong> <code>${event.method}</code></li>
      <li><strong>时间:</strong> <code>${new Date().toLocaleString()}</code></li>
    </ul>
    
    <h2>下一步</h2>
    <p>要实现完整的 SSR，需要：</p>
    <ol>
      <li>使用 Vite 编译 TSX 文件</li>
      <li>或者使用预编译的组件</li>
      <li>集成完整的路由系统</li>
    </ol>
    
    <h2>测试路由</h2>
    <ul>
      <li><a href="/">首页</a></li>
      <li><a href="/about">关于页</a></li>
      <li><a href="/blog/test">博客</a></li>
    </ul>
  </body>
</html>`;

  return html;
});

