import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

export interface RenderOptions {
  /** 页面标题 */
  title?: string;
  /** Vite HMR 脚本 */
  viteScripts?: string;
}

/**
 * 渲染页面组件为 HTML
 */
export function renderComponent(
  Component: React.ComponentType<Record<string, unknown>>,
  props: Record<string, unknown>
): string {
  const element = React.createElement(Component, props);
  return ReactDOMServer.renderToString(element);
}

/**
 * 生成完整的 HTML 文档
 */
export function generateHTML(
  content: string,
  options: RenderOptions = {}
): string {
  const { title = 'Last.js App', viteScripts = '' } = options;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 0;
      }
    </style>
    ${viteScripts}
  </head>
  <body>
    <div id="root">${content}</div>
  </body>
</html>`;
}

/**
 * 生成 404 页面
 */
export function generate404HTML(pathname: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>404 - Not Found</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        background: #fafafa;
      }
      h1 { color: #333; }
      p { color: #666; }
      a { color: #0070f3; }
    </style>
  </head>
  <body>
    <h1>404 - Not Found</h1>
    <p>Path: ${pathname}</p>
    <p><a href="/">Go to Home</a></p>
  </body>
</html>`;
}

/**
 * 生成错误页面
 */
export function generateErrorHTML(error: Error | unknown): string {
  const message = error instanceof Error ? error.stack : String(error);

  return `<!DOCTYPE html>
<html>
  <head>
    <title>500 - Server Error</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 800px;
        margin: 50px auto;
        padding: 20px;
      }
      h1 { color: #e00; }
      pre {
        background: #f5f5f5;
        padding: 20px;
        overflow: auto;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <h1>500 - Internal Server Error</h1>
    <pre>${message}</pre>
  </body>
</html>`;
}

/**
 * 获取 Vite HMR 脚本
 */
export function getViteHMRScripts(): string {
  return `
    <script type="module" src="/@vite/client"></script>
    <script type="module">
      import RefreshRuntime from '/@react-refresh'
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>`;
}
