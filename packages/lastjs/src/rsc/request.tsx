// Request parsing utilities for RSC
// Based on @vitejs/plugin-rsc demo

export interface RenderRequest {
  request: Request;
  url: URL;
  isRsc: boolean;
  isAction: boolean;
  actionId?: string;
}

/**
 * Parse incoming request to determine its type:
 * - RSC stream request (client navigation)
 * - SSR HTML request (initial page load)
 * - Server Action request
 */
export function parseRenderRequest(request: Request): RenderRequest {
  const url = new URL(request.url);
  
  // Check if this is an RSC stream request
  const isRsc =
    url.searchParams.has('_rsc') ||
    request.headers.get('accept') === 'text/x-component' ||
    request.headers.get('rsc') === '1';
  
  // Check if this is a Server Action request
  const isAction = request.method === 'POST' && request.headers.has('rsc-action');
  const actionId = request.headers.get('rsc-action') || undefined;
  
  return {
    request,
    url,
    isRsc,
    isAction,
    actionId,
  };
}
