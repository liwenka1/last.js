export default function HomePage() {
  return (
    <div>
      <h1>Welcome to Last.js 🚀</h1>
      <p>A minimal Next.js alternative with App Router and SSR</p>
      
      <h2>Features</h2>
      <ul>
        <li>✅ File-system based App Router</li>
        <li>✅ Server-Side Rendering (SSR)</li>
        <li>✅ React 19 Support</li>
        <li>✅ Dynamic Routes [slug]</li>
        <li>✅ TypeScript Support</li>
        <li>✅ Powered by Vite + Nitro</li>
      </ul>

      <h2>Quick Start</h2>
      <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
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
