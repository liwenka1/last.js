// Minimal RSC Entry for testing
import { createElement } from 'react';
import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc';

function TestPage() {
  return createElement(
    'div',
    null,
    createElement('h1', null, 'Last.js Works!'),
    createElement('p', null, 'RSC is functioning correctly')
  );
}

export default async function handler(request: Request): Promise<Response> {
  console.log('[Simple RSC] Handler called:', request.url);

  const url = new URL(request.url);
  const element = createElement(TestPage);
  const rscStream = renderToReadableStream(element);

  // RSC 请求
  if (url.searchParams.has('_rsc')) {
    return new Response(rscStream, {
      headers: { 'Content-Type': 'text/x-components' },
    });
  }

  // HTML 请求：调用 SSR
  const ssrEntry = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr.js')
  >('ssr', 'index');

  const ssrResult = await ssrEntry.renderHTML(rscStream, {});
  const htmlStream = ssrResult.stream;

  return new Response(htmlStream, {
    headers: { 'Content-Type': 'text/html' },
  });
}
