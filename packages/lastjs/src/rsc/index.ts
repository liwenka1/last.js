/**
 * RSC (React Server Components) Module
 * 基于官方 @vitejs/plugin-rsc demo
 */

// RSC Entry: Request Handler (default export)
export { default as handleRSCRequest } from './entry.rsc.js';

// SSR Entry: Render Function
export { renderHTML } from './entry.ssr.js';
