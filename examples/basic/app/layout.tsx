import type { ReactNode } from 'react';

export const metadata = {
  title: 'Last.js - A Minimal Next.js Alternative',
  description: 'Built with React 19 and modern web technologies',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <nav style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
          <a href="/" style={{ marginRight: '1rem' }}>
            Home
          </a>
          <a href="/about" style={{ marginRight: '1rem' }}>
            About
          </a>
          <a href="/blog/hello-world">Blog</a>
        </nav>
        <main style={{ padding: '2rem' }}>{children}</main>
      </body>
    </html>
  );
}

