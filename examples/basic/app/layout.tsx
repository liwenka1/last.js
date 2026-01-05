import type { ReactNode } from 'react';
import { Nav } from './components/Nav.js';

// 根 layout 的默认 metadata
// 页面可以通过 export const metadata 或 generateMetadata 覆盖
export const metadata = {
  title: 'Last.js App',
  description: 'A minimal Next.js alternative with App Router and SSR',
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
