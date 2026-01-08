import { createElement, Suspense } from 'react';

export interface RootProps {
  url: URL;
}

/**
 * Root component
 */
export function Root({ url }: RootProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Last.js</title>
      </head>
      <body>
        <Suspense fallback={<div>Loading...</div>}>
          <Page url={url} />
        </Suspense>
      </body>
    </html>
  );
}

/**
 * Page loader
 * CRITICAL: All variables must be defined INSIDE the try block!
 */
async function Page({ url }: { url: URL }) {
  try {
    // ✅ Define ALL variables inside try block to avoid scope bug
    const appDir = process.env.APP_DIR || 'app';
    const pathToLoad = url.pathname === '/'
      ? `${appDir}/page.tsx`
      : `${appDir}${url.pathname}/page.tsx`;

    console.log('[Page] Loading:', pathToLoad);

    const pageMod = await import.meta.viteRsc.loadModule('rsc', pathToLoad);
    const PageComponent = pageMod?.default;

    if (PageComponent) {
      return createElement(PageComponent, {});
    }

    return <NotFound url={url} />;
  } catch (err: any) {
    console.log('[Page] Load failed:', err.message);
    return <NotFound url={url} />;
  }
}

function NotFound({ url }: { url: URL }) {
  const appDir = process.env.APP_DIR || 'app';
  const expectedPath = url.pathname === '/'
    ? `${appDir}/page.tsx`
    : `${appDir}${url.pathname}/page.tsx`;

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
      <h1>404 - Page Not Found</h1>
      <p>
        The page <code>{url.pathname}</code> could not be found.
      </p>
      <p>
        <a href="/">Go back home</a>
      </p>
      <p style={{ marginTop: '40px', color: '#666', fontSize: '14px' }}>
        Expected file: <code>{expectedPath}</code>
      </p>
    </div>
  );
}
