import type { ReactNode } from 'react';
import { Nav } from './components/Nav';

// 根 layout 的默认 metadata
export const metadata = {
  title: 'Last.js App',
  description: 'A minimal Next.js alternative with SSR and Streaming',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
          }
          nav {
            padding: 1rem 2rem;
            border-bottom: 1px solid #eee;
            background: #f8f9fa;
          }
          main {
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
          }
          a {
            color: #0070f3;
          }
          code {
            background: #f5f5f5;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
          }
          pre {
            background: #f5f5f5;
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
          }
        `}</style>
      </head>
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
