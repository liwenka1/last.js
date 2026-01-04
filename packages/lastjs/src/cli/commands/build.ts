import { join } from 'pathe';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { build as viteBuild } from 'vite';
import { lastVitePlugin } from '../../vite/plugin.js';
import { FileSystemRouter } from '../../router/fs-router.js';

export interface BuildCommandOptions {
  /** 输出目录 */
  outDir?: string;
}

interface BuildManifest {
  routes: Array<{
    path: string;
    pagePath: string;
    layoutPaths: string[];
  }>;
  clientEntry: string;
}

/**
 * 构建生产版本
 */
export async function build(options: BuildCommandOptions): Promise<void> {
  const rootDir = process.cwd();
  const appDir = join(rootDir, 'app');
  const outDir = options.outDir || join(rootDir, '.lastjs');
  const clientOutDir = join(outDir, 'client');
  const serverOutDir = join(outDir, 'server');

  console.log(pc.cyan('🔨 Building Last.js application...\n'));

  try {
    // 1. 清理并创建输出目录
    console.log(pc.dim('  Preparing output directory...'));
    await mkdir(outDir, { recursive: true });
    await mkdir(clientOutDir, { recursive: true });
    await mkdir(serverOutDir, { recursive: true });

    // 2. 扫描路由
    console.log(pc.dim('  Scanning routes...'));
    const router = new FileSystemRouter(appDir);
    await router.scan();

    // 3. 收集所有需要构建的入口
    const entries: Record<string, string> = {};
    const routeInfos: BuildManifest['routes'] = [];

    // 收集所有 layout 和 page 文件
    const allFiles = new Set<string>();

    // 遍历路由收集文件
    const routes = router.getRoutes();
    for (const route of routes) {
      const match = router.match(route.path);
      if (match) {
        const layoutPaths = router.getLayoutChain(match.node);

        // 添加到入口
        layoutPaths.forEach((p) => allFiles.add(p));
        allFiles.add(match.filePath);

        // 记录路由信息
        routeInfos.push({
          path: route.path,
          pagePath: toRelativePath(match.filePath, rootDir),
          layoutPaths: layoutPaths.map((p) => toRelativePath(p, rootDir)),
        });
      }
    }

    // 转换为入口对象
    allFiles.forEach((file) => {
      const name = toRelativePath(file, rootDir).replace(/\.[^.]+$/, '');
      entries[name] = file;
    });

    // 4. 构建客户端代码
    // 生成一个客户端入口，静态导入所有页面和布局组件
    const imports = Array.from(allFiles)
      .map((f, i) => {
        const relativePath = toRelativePath(f, rootDir);
        return `import * as mod${i} from "./${relativePath}";`;
      })
      .join('\n');

    const registry = Array.from(allFiles)
      .map((f, i) => {
        const relativePath = toRelativePath(f, rootDir);
        return `  "${relativePath}": mod${i}.default || mod${i}`;
      })
      .join(',\n');

    const clientEntryContent = `
import { hydrateRoot } from 'react-dom/client';
import * as React from 'react';

// 静态导入所有组件
${imports}

// 组件注册表
const components = {
${registry}
};

async function hydrate() {
  const data = window.__LASTJS_DATA__;
  if (!data) {
    console.warn('[Last.js] No hydration data found');
    return;
  }

  const { props, layoutPaths, pagePath } = data;

  try {
    // 从注册表获取组件
    const layouts = layoutPaths.map((path) => {
      const component = components[path];
      if (!component) {
        console.error('[Last.js] Layout not found:', path);
      }
      return component;
    }).filter(Boolean);

    const Page = components[pagePath];
    if (!Page) {
      console.error('[Last.js] Page not found:', pagePath);
      return;
    }

    // 从 page 开始构建组件树
    let element = React.createElement(Page, props);

    // 从内到外包裹 layout
    for (let i = layouts.length - 1; i >= 0; i--) {
      const Layout = layouts[i];
      element = React.createElement(Layout, { children: element });
    }

    // Hydrate
    const root = document.getElementById('__lastjs');
    if (root) {
      hydrateRoot(root, element);
      console.log('[Last.js] Hydration complete ✓');
    }
  } catch (error) {
    console.error('[Last.js] Hydration failed:', error);
  }
}

// 等待 DOM 加载完成后执行 hydration
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrate);
} else {
  hydrate();
}
`;

    // 写入临时入口文件
    const tempEntryPath = join(rootDir, '.lastjs-client.tsx');
    await writeFile(tempEntryPath, clientEntryContent);

    console.log(pc.dim('  Building client bundle...'));
    try {
      await viteBuild({
        root: rootDir,
        plugins: lastVitePlugin({ appDir }),
        build: {
          outDir: clientOutDir,
          emptyOutDir: true,
          manifest: true,
          rollupOptions: {
            input: {
              client: tempEntryPath,
            },
            output: {
              // 确保 React 和其他共享依赖被提取到单独的 chunk
              manualChunks: {
                react: ['react', 'react-dom'],
              },
            },
          },
          ssrManifest: true,
        },
        logLevel: 'warn',
      });
    } finally {
      // 清理临时文件
      try {
        const { unlink } = await import('node:fs/promises');
        await unlink(tempEntryPath);
      } catch {
        // 忽略清理错误
      }
    }

    // 5. 构建服务端代码
    console.log(pc.dim('  Building server bundle...'));
    await viteBuild({
      root: rootDir,
      plugins: lastVitePlugin({ appDir }),
      build: {
        outDir: serverOutDir,
        emptyOutDir: true,
        ssr: true,
        rollupOptions: {
          input: entries,
        },
      },
      ssr: {
        noExternal: true,
      },
      logLevel: 'warn',
    });

    // 6. 读取 Vite manifest
    const manifestPath = join(clientOutDir, '.vite/manifest.json');
    let clientManifest: Record<string, { file: string }> = {};
    if (existsSync(manifestPath)) {
      const manifestContent = await readFile(manifestPath, 'utf-8');
      clientManifest = JSON.parse(manifestContent);
    }

    // 查找客户端入口文件
    let clientEntryFile = 'assets/client.js';
    for (const [key, value] of Object.entries(clientManifest)) {
      if (key.includes('.lastjs-client') || key === 'client') {
        clientEntryFile = value.file;
        break;
      }
    }

    // 7. 生成构建 manifest
    const buildManifest: BuildManifest = {
      routes: routeInfos,
      clientEntry: clientEntryFile,
    };

    await writeFile(
      join(outDir, 'manifest.json'),
      JSON.stringify(buildManifest, null, 2)
    );

    // 8. 复制 public 目录（如果存在）
    const publicDir = join(rootDir, 'public');
    if (existsSync(publicDir)) {
      console.log(pc.dim('  Copying public assets...'));
      await copyDir(publicDir, clientOutDir);
    }

    console.log(pc.green('\n✓ Build completed successfully!\n'));
    console.log(pc.dim(`  Output: ${outDir}`));
    console.log(pc.dim(`  Client: ${clientOutDir}`));
    console.log(pc.dim(`  Server: ${serverOutDir}\n`));
    console.log(
      pc.cyan('  Run `lastjs start` to start the production server.\n')
    );
  } catch (error) {
    console.error(pc.red('\n✗ Build failed:\n'));
    console.error(error);
    process.exit(1);
  }
}

/**
 * 转换为相对路径
 */
function toRelativePath(absolutePath: string, rootDir: string): string {
  if (absolutePath.startsWith(rootDir)) {
    return absolutePath.slice(rootDir.length + 1);
  }
  return absolutePath;
}

/**
 * 复制目录
 */
async function copyDir(src: string, dest: string): Promise<void> {
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await mkdir(destPath, { recursive: true });
      await copyDir(srcPath, destPath);
    } else {
      const content = await readFile(srcPath);
      await writeFile(destPath, content);
    }
  }
}
