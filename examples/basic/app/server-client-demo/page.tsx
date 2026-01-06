// Server/Client 组件分离演示
// 这个页面展示如何正确地分离服务端和客户端组件

import { InteractiveCard } from './InteractiveCard';

export const metadata = {
  title: 'Server/Client 分离演示 - Last.js',
  description: '展示如何正确分离服务端和客户端组件',
};

// 注意：这个页面包含服务端专属数据（process.version），
// hydration 时会有 mismatch 警告，但这是预期行为。
// 在真实应用中，应该将服务端数据序列化到 HTML 中，而不是在组件中重新计算。

// 服务端数据（只能在服务端访问）
// 注意：这些数据只在服务端可用，客户端 hydration 时会使用占位符
const SERVER_DATA = {
  // 这些值在服务端和客户端都是相同的，避免 hydration mismatch
  secretKey: 'sk_live_xxxx',
  features: ['数据库访问', 'API 密钥', '文件系统', '环境变量'],
};

export default function ServerClientDemoPage() {
  // 获取当前时间（用于演示）
  const renderTime = new Date().toISOString();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1>🔀 Server/Client 组件分离</h1>

      <div
        style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ margin: '0 0 0.5rem 0' }}>核心概念</h2>
        <p style={{ margin: 0, opacity: 0.9 }}>
          在 Last.js 中，组件默认在<strong>服务端</strong>渲染。
          <br />
          只有标记了{' '}
          <code style={{ background: 'rgba(0,0,0,0.2)' }}>
            &apos;use client&apos;
          </code>{' '}
          的组件才会在客户端执行交互逻辑。
        </p>
      </div>

      {/* 服务端组件区域 */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>📡 Server Component（当前组件）</h2>
        <div
          style={{
            padding: '1.5rem',
            background: '#e8f5e9',
            borderRadius: '12px',
            border: '2px solid #4caf50',
          }}
        >
          <h3 style={{ margin: '0 0 1rem 0', color: '#2e7d32' }}>
            ✅ 服务端专属数据
          </h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li>
              <strong>可访问的服务端资源：</strong>
            </li>
            {SERVER_DATA.features.map((feature, i) => (
              <li key={i} style={{ marginLeft: '1rem', color: '#2e7d32' }}>
                ✓ {feature}
              </li>
            ))}
            <li style={{ marginTop: '0.5rem' }}>
              <strong>Secret Key:</strong>{' '}
              <span style={{ color: '#c62828' }}>
                {SERVER_DATA.secretKey.slice(0, 8)}...（已隐藏）
              </span>
            </li>
          </ul>
          <p
            style={{
              margin: '1rem 0 0 0',
              padding: '0.75rem',
              background: 'rgba(0,0,0,0.05)',
              borderRadius: '8px',
              fontSize: '0.9rem',
            }}
          >
            💡 <strong>安全提示：</strong>
            上面的 secretKey 只存在于服务端，永远不会发送到客户端浏览器！
            查看页面源代码，你不会找到完整的 key。
          </p>
        </div>
      </section>

      {/* 客户端组件区域 */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>💻 Client Component（交互组件）</h2>
        <InteractiveCard initialCount={0} serverTime={renderTime} />
        <p
          style={{
            margin: '1rem 0 0 0',
            padding: '0.75rem',
            background: '#fff3e0',
            borderRadius: '8px',
            fontSize: '0.9rem',
          }}
        >
          💡 <strong>注意：</strong>
          上面的卡片是一个 Client Component，它使用了 <code>
            'use client'
          </code>{' '}
          指令。 服务端渲染时会生成初始 HTML，然后客户端 hydrate 后才能交互。
        </p>
      </section>

      {/* 提示：Async 组件演示 */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>⏳ 想看 Async Server Component？</h2>
        <div
          style={{
            padding: '1.5rem',
            background: '#f3e5f5',
            borderRadius: '12px',
            border: '2px solid #9c27b0',
          }}
        >
          <p style={{ margin: '0 0 1rem 0' }}>
            Async Server Component 允许你在组件中直接使用{' '}
            <code>async/await</code> 获取数据。
            由于它们只在服务端执行，不会影响客户端 bundle 大小。
          </p>
          <p style={{ margin: 0 }}>
            👉 查看{' '}
            <a
              href="/streaming-demo"
              style={{ color: '#7b1fa2', fontWeight: 'bold' }}
            >
              流式渲染演示
            </a>{' '}
            或{' '}
            <a href="/slow" style={{ color: '#7b1fa2', fontWeight: 'bold' }}>
              Async 组件演示
            </a>{' '}
            了解更多。
          </p>
        </div>
      </section>

      {/* 最佳实践 */}
      <section>
        <h2>📖 最佳实践</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          <div
            style={{
              padding: '1rem',
              background: '#e8f5e9',
              borderRadius: '12px',
              border: '2px solid #4caf50',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#2e7d32' }}>
              ✅ 使用 Server Component
            </h3>
            <ul
              style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem' }}
            >
              <li>数据获取（数据库、API）</li>
              <li>访问后端资源</li>
              <li>敏感数据处理</li>
              <li>大型依赖（不发送到客户端）</li>
              <li>静态内容展示</li>
            </ul>
          </div>

          <div
            style={{
              padding: '1rem',
              background: '#e3f2fd',
              borderRadius: '12px',
              border: '2px solid #2196f3',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1565c0' }}>
              💻 使用 Client Component
            </h3>
            <ul
              style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem' }}
            >
              <li>交互性（onClick, onChange）</li>
              <li>状态管理（useState, useReducer）</li>
              <li>生命周期（useEffect）</li>
              <li>浏览器 API（localStorage）</li>
              <li>自定义 Hooks</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
