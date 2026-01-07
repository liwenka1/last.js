export { startDevServer } from './dev-server.js';
export type { DevServerOptions, DevServerResult } from './dev-server.js';

// 生产服务器导出
export { startProductionServer } from './production-server.js';
export type { ProductionServerOptions } from './production-server.js';

// API 路由相关导出
export { ApiRouter } from './api-router.js';
export type { ApiRoute, ApiRouteMatch } from './api-router.js';

// 重新导出 h3 的工具函数，用于 API 路由
export {
  getQuery,
  readBody,
  getRequestURL,
  getMethod,
  setResponseHeader,
  setResponseStatus,
  createError,
  getCookie,
  setCookie,
} from 'h3';
