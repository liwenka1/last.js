import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc';
import { Root } from './Root.tsx';
import { parseRenderRequest } from './request.tsx';

/**
 * RSC Entry Handler
 * 
 * Keeps this handler as simple as possible to avoid @vitejs/plugin-rsc
 * transformation bugs. Complex routing logic is handled in the <Root /> component.
 */
export default async function handler(request: Request): Promise<Response> {
  console.log('[RSC] Handler called:', request.url);
  
  const renderRequest = parseRenderRequest(request);

  // TODO: Handle Server Actions here when needed
  // if (renderRequest.isAction) { ... }

  // Render the root component
  // All routing logic is delegated to the <Root /> component
  const rscPayload = <Root url={renderRequest.url} />;

  const rscStream = renderToReadableStream(rscPayload, {
    onError(err) {
      console.error('[RSC] Stream error:', err);
    },
  });

  // Return RSC stream for client-side navigation
  if (renderRequest.isRsc) {
    return new Response(rscStream, {
      headers: { 'Content-Type': 'text/x-component' },
    });
  }

  // Delegate to SSR for HTML rendering (initial page load)
  const ssrMod = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr.tsx')
  >('ssr', 'index');
  
  const result = await ssrMod.renderHTML(rscStream, {
    url: renderRequest.url,
  });

  return new Response(result.stream, {
    status: result.status || 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

if (import.meta.hot) {
  import.meta.hot.accept();
}
