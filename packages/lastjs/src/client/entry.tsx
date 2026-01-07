/**
 * 客户端入口文件 - 用于生产环境
 * 负责客户端水合（hydration）
 */

import { hydrateRoot } from 'react-dom/client';

// 获取水合数据
const hydrationData = (window as any).__LASTJS_DATA__;

if (!hydrationData) {
  console.error('[Last.js] No hydration data found!');
  throw new Error('Missing hydration data');
}

console.log('[Last.js] Starting client hydration...', hydrationData);

/**
 * 获取模块的实际导入路径
 * 使用 moduleMap 将源路径转换为构建后的路径
 */
function getModuleImportPath(srcPath: string): string {
  const { moduleMap } = hydrationData;
  // 去掉扩展名
  const pathWithoutExt = srcPath.replace(/\.(tsx?|jsx?)$/, '');
  const modulePath = moduleMap[pathWithoutExt];

  if (!modulePath) {
    console.error(
      `[Last.js] Module not found in map: ${pathWithoutExt}`,
      moduleMap
    );
    throw new Error(`Module not found: ${srcPath}`);
  }

  console.log(`[Last.js] Resolved ${srcPath} -> ${modulePath}`);
  return modulePath;
}

/**
 * 全局导航处理函数
 * 这个函数会被 RouterProvider 调用来处理客户端导航
 */
async function globalHandleNavigate(
  href: string,
  _options?: { replace?: boolean }
) {
  console.log('[Last.js] Client-side navigation to:', href);

  try {
    // 1. 获取新页面的数据（带上特殊 header 告诉服务器这是客户端导航）
    const response = await fetch(href, {
      headers: {
        'X-LastJS-Navigation': 'true',
      },
    });

    if (!response.ok) {
      console.error('[Last.js] Navigation failed:', response.status);
      window.location.href = href;
      return;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.log('[Last.js] Got HTML response, doing full page reload');
      window.location.href = href;
      return;
    }

    // 2. 解析 JSON 数据
    const data = await response.json();
    console.log('[Last.js] Navigation data received:', data);

    const {
      props: newProps,
      layoutPaths: newLayoutPaths,
      pagePath: newPagePath,
      params: newParams,
      moduleMap: newModuleMap,
    } = data;

    // 3. 动态导入新的页面和布局
    console.log('[Last.js] Loading new layouts:', newLayoutPaths);
    console.log('[Last.js] Using moduleMap:', newModuleMap);

    const newLayouts = await Promise.all(
      newLayoutPaths.map(async (path: string) => {
        const pathWithoutExt = path.replace(/\.(tsx?|jsx?)$/, '');
        const modulePath = newModuleMap[pathWithoutExt];
        console.log(`[Last.js] Importing layout from: ${modulePath}`);
        if (!modulePath) {
          throw new Error(`Failed to resolve layout module: ${path}`);
        }
        const mod = await import(/* @vite-ignore */ modulePath);
        return mod.default || mod;
      })
    );

    console.log('[Last.js] Loading new page:', newPagePath);
    const pathWithoutExt = newPagePath.replace(/\.(tsx?|jsx?)$/, '');
    const pageModulePath = newModuleMap[pathWithoutExt];
    if (!pageModulePath) {
      throw new Error(`Failed to resolve page module: ${newPagePath}`);
    }
    const pageMod = await import(/* @vite-ignore */ pageModulePath);
    const NewPage = pageMod.default;

    // 4. 构建新的组件树
    let newApp: React.ReactElement = <NewPage {...newProps} />;

    // 从内到外包裹 layout
    for (let i = newLayouts.length - 1; i >= 0; i--) {
      const Layout = newLayouts[i];
      if (typeof Layout !== 'function') {
        console.error('[Last.js] Layout is not a valid component:', Layout);
        continue;
      }
      newApp = <Layout>{newApp}</Layout>;
    }

    // 5. 重新渲染（使用 root.render 而不是 hydrateRoot）
    console.log('[Last.js] Re-rendering with new content');

    // 导入 RouterProvider（如果还没导入）
    const { RouterProvider } = await import('./context.js');

    // 注意：这里使用同一个 globalHandleNavigate 函数，形成递归
    const newElement = (
      <RouterProvider
        initialPathname={
          newPagePath.replace('/app', '').replace(/\/page\.tsx$/, '') || '/'
        }
        initialParams={newParams}
        onNavigate={globalHandleNavigate}
      >
        {newApp}
      </RouterProvider>
    );

    // 使用 root.render 更新内容
    const root = (window as any).__LASTJS_ROOT__;
    if (!root) {
      console.error('[Last.js] Root not found, doing full page reload');
      window.location.href = href;
      return;
    }
    root.render(newElement);

    console.log('[Last.js] Client navigation completed! ✅');
  } catch (error) {
    console.error('[Last.js] Navigation error:', error);
    window.location.href = href;
  }
}

/**
 * 动态加载并渲染页面
 */
async function hydrate() {
  try {
    const { layoutPaths, pagePath, props, params } = hydrationData;

    console.log('[Last.js] Loading layouts:', layoutPaths);
    console.log('[Last.js] Loading page:', pagePath);

    // 1. 加载所有 layout 组件
    const layouts = await Promise.all(
      layoutPaths.map(async (path: string) => {
        const modulePath = getModuleImportPath(path);
        console.log('[Last.js] Importing layout from:', modulePath);
        const mod = await import(/* @vite-ignore */ modulePath);
        return mod.default || mod;
      })
    );

    // 2. 加载页面组件
    const pageModulePath = getModuleImportPath(pagePath);
    console.log('[Last.js] Importing page from:', pageModulePath);
    const pageMod = await import(/* @vite-ignore */ pageModulePath);
    const Page = pageMod.default;

    // 3. 验证组件
    if (typeof Page !== 'function') {
      console.error(
        '[Last.js] Page is not a valid component:',
        Page,
        typeof Page
      );
      throw new Error('Page component must be a function');
    }

    console.log('[Last.js] Building component tree...');
    console.log('[Last.js] Page component:', Page.name || 'Anonymous');
    console.log(
      '[Last.js] Layouts:',
      layouts.map((l: any) => l.name || 'Anonymous')
    );

    // 4. 水合到 DOM
    const container = document.getElementById('__lastjs');
    if (!container) {
      throw new Error('Root container not found');
    }

    console.log('[Last.js] Hydrating root element...');

    // 导入 RouterProvider
    const { RouterProvider } = await import('./context.js');

    // 5. 构建组件树 - 使用 JSX 而不是直接调用
    let app: React.ReactElement = <Page {...props} />;

    // 从内到外包裹 layout
    for (let i = layouts.length - 1; i >= 0; i--) {
      const Layout = layouts[i];
      if (typeof Layout !== 'function') {
        console.error('[Last.js] Layout is not a valid component:', Layout);
        continue;
      }
      app = <Layout>{app}</Layout>;
    }

    // 包裹 RouterProvider，使用全局的 globalHandleNavigate
    const element = (
      <RouterProvider
        initialPathname={
          pagePath.replace('/app', '').replace(/\/page\.tsx$/, '') || '/'
        }
        initialParams={params}
        onNavigate={globalHandleNavigate}
      >
        {app}
      </RouterProvider>
    );

    // 直接水合，不用 StrictMode（避免可能的问题）
    const root = hydrateRoot(container, element, {
      onRecoverableError: (error) => {
        console.warn('[Last.js] Recoverable hydration error:', error);
      },
    });

    // 保存 root 到全局变量，以便客户端导航时使用
    (window as any).__LASTJS_ROOT__ = root;

    console.log('[Last.js] Client hydration completed! ✅');
  } catch (error) {
    console.error('[Last.js] Hydration failed:', error);
    throw error;
  }
}

// 启动水合
hydrate().catch((error) => {
  console.error('[Last.js] Fatal hydration error:', error);
});
