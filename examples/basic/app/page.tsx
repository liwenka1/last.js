// Server Component - 默认在服务端渲染
// 没有 'use client' 指令意味着这是一个服务端组件

import { Counter } from './components/Counter';

export const metadata = {
  title: 'Home - Last.js',
  description: 'A minimal Next.js alternative with SSR and Streaming',
};

// 服务端数据获取（直接在组件中执行）
function getServerTime() {
  return new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
  });
}

export default function HomePage() {
  const serverTime = getServerTime();

  return (
    <div>
      <h1>Welcome to Last.js 🚀</h1>
      <p>A minimal Next.js alternative with SSR and Streaming</p>

      {/* 服务端渲染的内容 */}
      <div
        style={{
          margin: '1.5rem 0',
          padding: '1rem',
          background: '#e8f5e9',
          borderRadius: '8px',
          border: '2px solid #4caf50',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#2e7d32' }}>
          📡 Server-Side Rendered
        </h3>
        <p style={{ margin: 0 }}>
          服务器渲染时间: <strong>{serverTime}</strong>
        </p>
        <small style={{ color: '#666' }}>
          这段内容在服务端生成，刷新页面会看到时间更新
        </small>
      </div>

      {/* 客户端交互组件 */}
      <Counter />

      <h2>✨ Features</h2>
      <ul>
        <li>✅ File-system based App Router</li>
        <li>✅ Server-Side Rendering (SSR)</li>
        <li>✅ Streaming with Suspense</li>
        <li>✅ Client-side Hydration</li>
        <li>✅ React 19 Support</li>
        <li>✅ Dynamic Routes [slug]</li>
        <li>✅ Layout Nesting</li>
        <li>✅ TypeScript Support</li>
        <li>✅ Powered by Vite</li>
      </ul>

      <h2>📖 Demo Pages</h2>
      <ul>
        <li>
          <a href="/streaming-demo">🌊 流式渲染演示</a> - 体验 Suspense 流式加载
        </li>
        <li>
          <a href="/slow">⏱️ Async 组件演示</a> - 服务端 async/await 数据获取
        </li>
        <li>
          <a href="/blog/hello-world">📝 动态路由</a> - [slug] 参数路由
        </li>
        <li>
          <a href="/user/123">👤 用户页面</a> - 另一个动态路由示例
        </li>
      </ul>

      <h2>🚀 Quick Start</h2>
      <pre
        style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}
      >
        {`# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start`}
      </pre>
    </div>
  );
}
