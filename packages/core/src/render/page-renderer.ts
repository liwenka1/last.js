import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import type { ReactElement } from 'react';
import type { RouteMatch } from '../router/types.js';

export interface RenderContext {
  params: Record<string, string | string[]>;
  searchParams: Record<string, string>;
}

export interface RenderResult {
  html: string;
  head: string;
}

/**
 * 渲染页面
 */
export async function renderPage(
  match: RouteMatch,
  context: RenderContext
): Promise<string> {
  try {
    // 1. 加载组件
    const components = await loadComponents(match);

    // 2. 组合组件树
    const tree = await composeComponentTree(components, context);

    // 3. 渲染为 HTML
    const content = renderToString(tree);

    // 4. 生成完整 HTML 文档
    return generateHTML(content, {
      title: 'Last.js App',
    });
  } catch (error) {
    console.error('Render error:', error);
    throw error;
  }
}

/**
 * 加载路由组件
 */
async function loadComponents(match: RouteMatch) {
  const components: {
    layouts: any[];
    page: any;
  } = {
    layouts: [],
    page: null,
  };

  // 收集所有 layout（从根到叶）
  const layoutPaths: string[] = [];
  let currentNode: typeof match.node | undefined = match.node;

  while (currentNode) {
    if (currentNode.files.layout) {
      layoutPaths.unshift(currentNode.files.layout);
    }
    currentNode = currentNode.parent;
  }

  // 加载所有 layout
  for (const layoutPath of layoutPaths) {
    const mod = await import(layoutPath);
    components.layouts.push(mod.default || mod);
  }

  // 加载 page
  if (match.node.files.page) {
    const mod = await import(match.node.files.page);
    components.page = mod.default || mod;
  }

  return components;
}

/**
 * 组合组件树
 */
async function composeComponentTree(
  components: { layouts: any[]; page: any },
  context: RenderContext
): Promise<ReactElement> {
  // 从 page 开始
  let tree: ReactElement = createElement(components.page, {
    params: context.params,
    searchParams: context.searchParams,
  });

  // 从内到外包裹 layout
  for (let i = components.layouts.length - 1; i >= 0; i--) {
    const Layout = components.layouts[i];
    tree = createElement(Layout, { children: tree });
  }

  return tree;
}

/**
 * 生成完整 HTML 文档
 */
function generateHTML(content: string, options: { title: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${options.title}</title>
  </head>
  <body>
    <div id="root">${content}</div>
    <script type="module" src="/@vite/client"></script>
  </body>
</html>`;
}
