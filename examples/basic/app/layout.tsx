import type { ReactNode } from 'react';

// TODO: Metadata API will be implemented in the next phase
// export const metadata = {
//   title: 'Last.js - A Minimal Next.js Alternative',
//   description: 'Built with React 19 and modern web technologies',
// };

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
          nav a {
            margin-right: 1.5rem;
            text-decoration: none;
            color: #0070f3;
            font-weight: 500;
          }
          nav a:hover {
            text-decoration: underline;
          }
          main {
            padding: 2rem;
          }
        `}</style>
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/blog/hello-world">Blog</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
