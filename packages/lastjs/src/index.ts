// Router
export { FileSystemRouter } from './router/index.js';
export type {
  RouteNode,
  RouteMatch,
  RouteModule,
  RouteType,
  Metadata,
} from './router/index.js';

// Render
export {
  renderComponent,
  renderWithLayouts,
  generateHTML,
  wrapWithDoctype,
  generateHydrationScript,
  generate404HTML,
  generateErrorHTML,
  getViteHMRScripts,
  renderMetadataToHTML,
} from './render/index.js';
export type { RenderOptions, HydrationData } from './render/index.js';

// Server
export { startDevServer } from './server/index.js';
export type { DevServerOptions, DevServerResult } from './server/index.js';

// Vite
export { lastVitePlugin } from './vite/index.js';
export type { LastVitePluginOptions } from './vite/index.js';

// Navigation
export {
  notFound,
  NotFoundError,
  isNotFoundError,
} from './navigation/index.js';
