// Re-export router
export { FileSystemRouter } from './router/fs-router.js';
export { RouteMatcher } from './router/matcher.js';

// Re-export render
export { renderToStream } from './render/ssr.js';
export { renderPage } from './render/page-renderer.js';

// Re-export types
export type {
  RouteNode,
  RouteMatch,
  RouteModule,
  Metadata,
  ResolvedMetadata,
  RouteType,
} from './router/types.js';
export type { RenderContext, RenderResult } from './render/page-renderer.js';
