import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';
import type { Metadata } from '../router/types.js';

export interface RenderOptions {
  /** 页面标题 */
  title?: string;
  /** Vite HMR 脚本 */
  viteScripts?: string;
  /** Hydration 数据 */
  hydrationData?: HydrationData;
  /** 客户端入口脚本路径 */
  clientEntry?: string;
  /** 页面 Metadata */
  metadata?: Metadata;
}

export interface HydrationData {
  props: Record<string, unknown>;
  layoutPaths: string[];
  pagePath: string;
  params?: Record<string, string>;
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
 * 渲染带有 Layout 嵌套的页面
 * @param layouts - Layout 组件数组（从根到叶）
 * @param Page - 页面组件
 * @param props - 传递给页面的 props
 */
export function renderWithLayouts(
  layouts: React.ComponentType<{ children: React.ReactNode }>[],
  Page: React.ComponentType<Record<string, unknown>>,
  props: Record<string, unknown>
): string {
  // 从页面开始构建组件树
  let element: React.ReactElement = React.createElement(Page, props);

  // 从内到外包裹 layout（反向遍历）
  for (let i = layouts.length - 1; i >= 0; i--) {
    const Layout = layouts[i];
    element = React.createElement(Layout, { children: element });
  }

  return ReactDOMServer.renderToString(element);
}

/**
 * 生成 hydration 脚本
 */
export function generateHydrationScript(data: HydrationData): string {
  // 转义 HTML 特殊字符，防止 XSS
  const jsonStr = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return `<script>window.__LASTJS_DATA__=${jsonStr};</script>`;
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 生成完整的 HTML 文档（用于没有根 Layout 的情况）
 */
export function generateHTML(
  content: string,
  options: RenderOptions = {}
): string {
  const {
    title = 'Last.js App',
    viteScripts = '',
    hydrationData,
    clientEntry,
    metadata,
  } = options;

  const hydrationScript = hydrationData
    ? generateHydrationScript(hydrationData)
    : '';
  const clientScript = clientEntry
    ? `<script type="module" src="${clientEntry}"></script>`
    : '';

  // 如果有 metadata，使用 metadata 中的 title，否则使用默认 title
  const pageTitle = metadata?.title
    ? typeof metadata.title === 'string'
      ? metadata.title
      : metadata.title.default
    : title;

  // 生成 metadata 标签（排除 title，因为已经单独处理）
  const metadataWithoutTitle = metadata
    ? { ...metadata, title: undefined }
    : undefined;
  const metadataTags = metadataWithoutTitle
    ? renderMetadataToHTML(metadataWithoutTitle)
    : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHTML(pageTitle)}</title>
    ${metadataTags}
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
    <div id="__lastjs">${content}</div>
    ${hydrationScript}
    ${clientScript}
  </body>
</html>`;
}

/**
 * 包装渲染结果为完整 HTML 文档
 * 用于有根 Layout 的情况（Layout 已包含 html/head/body）
 */
export function wrapWithDoctype(
  content: string,
  options: RenderOptions = {}
): string {
  const { viteScripts = '', hydrationData, clientEntry, metadata } = options;

  const hydrationScript = hydrationData
    ? generateHydrationScript(hydrationData)
    : '';
  const clientScript = clientEntry
    ? `<script type="module" src="${clientEntry}"></script>`
    : '';

  // 如果内容已经是完整的 HTML 文档
  if (content.includes('<html')) {
    let result = content;

    // 移除原有的 <title> 标签（避免 hydration 时被 React 覆盖）
    result = result.replace(/<title>[^<]*<\/title>/, '');

    // 如果有 metadata 中的 title，在 </head> 前注入
    // 注意：这个 title 会在 headInjection 中一起注入

    // 生成完整的 metadata 标签（包含 title）
    const metadataTags = metadata ? renderMetadataToHTML(metadata) : '';

    // 在 </head> 前注入 metadata 和 Vite 脚本
    const headInjection = [metadataTags, viteScripts]
      .filter(Boolean)
      .join('\n    ');
    if (headInjection) {
      result = result.replace('</head>', `${headInjection}\n  </head>`);
    }

    // 用 <div id="__lastjs"> 包裹 body 内容，并注入 hydration 脚本
    // 找到 <body> 和 </body> 之间的内容
    result = result.replace(
      /(<body[^>]*>)([\s\S]*?)(<\/body>)/,
      `$1<div id="__lastjs">$2</div>${hydrationScript}${clientScript}$3`
    );

    return `<!DOCTYPE html>${result}`;
  }

  // 否则用默认模板包装
  return generateHTML(content, options);
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

/**
 * 将 Metadata 转换为 HTML meta 标签
 */
export function renderMetadataToHTML(metadata: Metadata): string {
  const tags: string[] = [];

  // Title
  if (metadata.title) {
    const title =
      typeof metadata.title === 'string'
        ? metadata.title
        : metadata.title.default;
    tags.push(`<title>${escapeHTML(title)}</title>`);
  }

  // Description
  if (metadata.description) {
    tags.push(
      `<meta name="description" content="${escapeHTML(metadata.description)}" />`
    );
  }

  // Keywords
  if (metadata.keywords) {
    const keywords = Array.isArray(metadata.keywords)
      ? metadata.keywords.join(', ')
      : metadata.keywords;
    tags.push(`<meta name="keywords" content="${escapeHTML(keywords)}" />`);
  }

  // Robots
  if (metadata.robots) {
    const robotsValues: string[] = [];
    if (metadata.robots.index !== undefined) {
      robotsValues.push(metadata.robots.index ? 'index' : 'noindex');
    }
    if (metadata.robots.follow !== undefined) {
      robotsValues.push(metadata.robots.follow ? 'follow' : 'nofollow');
    }
    if (robotsValues.length > 0) {
      tags.push(`<meta name="robots" content="${robotsValues.join(', ')}" />`);
    }
  }

  // Open Graph
  if (metadata.openGraph) {
    const og = metadata.openGraph;
    if (og.title) {
      tags.push(
        `<meta property="og:title" content="${escapeHTML(og.title)}" />`
      );
    }
    if (og.description) {
      tags.push(
        `<meta property="og:description" content="${escapeHTML(og.description)}" />`
      );
    }
    if (og.url) {
      tags.push(`<meta property="og:url" content="${escapeHTML(og.url)}" />`);
    }
    if (og.siteName) {
      tags.push(
        `<meta property="og:site_name" content="${escapeHTML(og.siteName)}" />`
      );
    }
    if (og.locale) {
      tags.push(
        `<meta property="og:locale" content="${escapeHTML(og.locale)}" />`
      );
    }
    if (og.type) {
      tags.push(`<meta property="og:type" content="${escapeHTML(og.type)}" />`);
    }
    if (og.images) {
      for (const image of og.images) {
        tags.push(
          `<meta property="og:image" content="${escapeHTML(image.url)}" />`
        );
        if (image.width) {
          tags.push(
            `<meta property="og:image:width" content="${image.width}" />`
          );
        }
        if (image.height) {
          tags.push(
            `<meta property="og:image:height" content="${image.height}" />`
          );
        }
        if (image.alt) {
          tags.push(
            `<meta property="og:image:alt" content="${escapeHTML(image.alt)}" />`
          );
        }
      }
    }
  }

  // Twitter Card
  if (metadata.twitter) {
    const tw = metadata.twitter;
    if (tw.card) {
      tags.push(
        `<meta name="twitter:card" content="${escapeHTML(tw.card)}" />`
      );
    }
    if (tw.title) {
      tags.push(
        `<meta name="twitter:title" content="${escapeHTML(tw.title)}" />`
      );
    }
    if (tw.description) {
      tags.push(
        `<meta name="twitter:description" content="${escapeHTML(tw.description)}" />`
      );
    }
    if (tw.creator) {
      tags.push(
        `<meta name="twitter:creator" content="${escapeHTML(tw.creator)}" />`
      );
    }
    if (tw.images) {
      for (const image of tw.images) {
        tags.push(
          `<meta name="twitter:image" content="${escapeHTML(image)}" />`
        );
      }
    }
  }

  // Icons
  if (metadata.icons) {
    if (metadata.icons.icon) {
      tags.push(
        `<link rel="icon" href="${escapeHTML(metadata.icons.icon)}" />`
      );
    }
    if (metadata.icons.shortcut) {
      tags.push(
        `<link rel="shortcut icon" href="${escapeHTML(metadata.icons.shortcut)}" />`
      );
    }
    if (metadata.icons.apple) {
      tags.push(
        `<link rel="apple-touch-icon" href="${escapeHTML(metadata.icons.apple)}" />`
      );
    }
  }

  return tags.join('\n    ');
}
