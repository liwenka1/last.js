// Server Component - 纯服务端渲染，无客户端 JS

export const metadata = {
  title: 'About - Last.js',
  description: 'Learn more about Last.js framework',
};

export default function AboutPage() {
  // 这些代码只在服务端执行
  // 注意：客户端导航时也会执行，所以需要安全检查
  const isServer = typeof process !== 'undefined' && process.version;
  const buildInfo = {
    version: '0.1.0',
    nodeVersion: isServer ? process.version : 'N/A (client)',
    platform: isServer ? process.platform : 'N/A (client)',
  };

  return (
    <div>
      <h1>About Last.js</h1>
      <p>
        Last.js is a minimal Next.js alternative built with modern web
        technologies.
      </p>

      <div
        style={{
          margin: '1.5rem 0',
          padding: '1rem',
          background: '#e3f2fd',
          borderRadius: '8px',
          border: '2px solid #2196f3',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#1565c0' }}>
          🖥️ Server-Only Data
        </h3>
        <p style={{ margin: 0 }}>
          <strong>Node Version:</strong> {buildInfo.nodeVersion}
          <br />
          <strong>Platform:</strong> {buildInfo.platform}
          <br />
          <strong>Last.js Version:</strong> {buildInfo.version}
        </p>
        <small style={{ color: '#666' }}>
          这些信息只能在服务端获取，证明这是一个 Server Component
        </small>
      </div>

      <h2>🛠️ Tech Stack</h2>
      <ul>
        <li>
          <strong>React 19</strong> - Latest React with improved SSR
        </li>
        <li>
          <strong>Vite</strong> - Lightning fast build tool
        </li>
        <li>
          <strong>H3</strong> - Universal HTTP framework
        </li>
        <li>
          <strong>TypeScript</strong> - Type-safe development
        </li>
      </ul>

      <h2>🎯 Architecture: RSC-aware SSR</h2>
      <div
        style={{
          padding: '1rem',
          background: '#fff3e0',
          borderRadius: '8px',
          border: '2px solid #ff9800',
        }}
      >
        <p style={{ margin: '0 0 1rem 0' }}>
          Last.js 采用 <strong>RSC-aware SSR</strong> 架构，这意味着：
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>
            <strong>默认服务端渲染</strong> - 所有组件默认在服务端执行
          </li>
          <li>
            <strong>流式传输</strong> - 使用 Suspense 实现流式 HTML 响应
          </li>
          <li>
            <strong>选择性 Hydration</strong> - 只有 'use client' 组件需要
            hydration
          </li>
          <li>
            <strong>Async 组件</strong> - 支持在组件中直接使用 async/await
          </li>
        </ul>
      </div>

      <h2>❓ Why Last.js?</h2>
      <p>
        We wanted to create a framework that captures the essence of Next.js's
        App Router while keeping the codebase minimal and understandable.
        Perfect for:
      </p>
      <ul>
        <li>Learning how modern React frameworks work under the hood</li>
        <li>Building small to medium-sized applications</li>
        <li>Projects that need SSR without the complexity of full RSC</li>
      </ul>
    </div>
  );
}
