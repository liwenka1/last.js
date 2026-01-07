import { join, dirname } from 'pathe';
import { mkdir, writeFile, readdir, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import { build as viteBuild } from 'vite';
import { lastVitePlugin } from '../../vite/plugin.js';
import { FileSystemRouter } from '../../router/fs-router.js';

export interface BuildCommandOptions {
  /** 输出目录 */
  outDir?: string;
}

/**
 * 构建生产版本 (SSR 模式)
 */
export async function build(options: BuildCommandOptions): Promise<void> {
  const rootDir = process.cwd();
  const appDir = join(rootDir, 'app');
  const outDir = options.outDir || join(rootDir, '.lastjs');

  console.log(pc.cyan('🔨 Building Last.js application...\n'));

  try {
    // 1. 清理并创建输出目录
    console.log(pc.dim('  Preparing output directory...'));
    if (existsSync(outDir)) {
      await rm(outDir, { recursive: true, force: true });
    }
    await mkdir(outDir, { recursive: true });
    await mkdir(join(outDir, 'server'), { recursive: true });
    await mkdir(join(outDir, 'client'), { recursive: true });

    // 2. 扫描路由
    console.log(pc.dim('  Scanning routes...'));
    const router = new FileSystemRouter(appDir);
    await router.scan();
    const routes = router.getRoutes();
    console.log(pc.dim(`    Found ${routes.length} routes`));

    // 3. 构建客户端 bundle
    console.log(pc.dim('  Building client bundle...'));

    // 获取 lastjs 包的根目录
    // 通过找到 package.json 的位置来定位包根目录
    let packageRoot: string;
    try {
      // 从当前模块向上查找 package.json
      const currentDir = dirname(fileURLToPath(import.meta.url));
      let searchDir = currentDir;
      while (searchDir !== dirname(searchDir)) {
        const pkgPath = join(searchDir, 'package.json');
        if (existsSync(pkgPath)) {
          const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
          if (pkg.name === 'lastjs') {
            packageRoot = searchDir;
            break;
          }
        }
        searchDir = dirname(searchDir);
      }

      if (!packageRoot!) {
        throw new Error('Could not find lastjs package.json');
      }
    } catch (error) {
      throw new Error(`Failed to locate lastjs package: ${error}`);
    }

    // 收集所有 app 文件作为客户端入口（用于动态导入）
    const appFiles: Record<string, string> = {};

    async function collectClientEntries(
      dir: string,
      prefix = ''
    ): Promise<void> {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          await collectClientEntries(fullPath, relativePath);
        } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
          // 使用 app_ 前缀的路径作为key，避免 / 导致文件名问题
          // app/blog/[slug]/page.tsx -> app_blog__slug__page
          // 需要匹配 Vite 的行为：_[slug]_ -> __slug__（不是 ___slug___）
          const key = `app_${relativePath}`
            .replace(/\//g, '_') // 斜杠转下划线: app_blog_[slug]_page.tsx
            .replace(/_\[([^\]]+)\]_/g, '__$1__') // _[xxx]_ 转 __xxx__: app_blog__slug__page.tsx
            .replace(/\[([^\]]+)\]/g, '__$1__') // [xxx] 转 __xxx__（处理边界情况）
            .replace(/\.(tsx?|jsx?)$/, ''); // 去掉扩展名
          appFiles[key] = fullPath;
        }
      }
    }

    await collectClientEntries(appDir);
    console.log(
      pc.dim(`    Collected ${Object.keys(appFiles).length} client entries`)
    );

    // 添加主客户端入口（使用虚拟模块）
    const clientInput: Record<string, string> = {
      '@lastjs/client': '/@lastjs/client', // 虚拟模块
      ...appFiles,
    };

    await viteBuild({
      root: rootDir,
      plugins: lastVitePlugin(),
      build: {
        outDir: join(outDir, 'client'),
        emptyOutDir: true,
        rollupOptions: {
          input: clientInput, // 使用包含主入口的 input
          output: {
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]',
            manualChunks: undefined, // 禁用手动分块
          },
          preserveEntrySignatures: 'strict', // 保留每个入口点的完整导出签名
        },
        manifest: true,
      },
    });

    // 4. 构建 SSR bundle
    console.log(pc.dim('  Building server bundle...'));

    // 收集所有页面、layout 和 API 路由作为入口
    const serverEntries: Record<string, string> = {};

    // 添加所有页面
    for (const route of routes) {
      const relativePath = route.filePath.replace(rootDir + '/', '');
      const entryName = relativePath
        .replace(/\//g, '_')
        .replace(/\.(tsx?|jsx?)$/, '');
      serverEntries[entryName] = route.filePath;
    }

    // 添加根 layout
    const rootLayoutPath = router.getRootLayoutPath();
    if (rootLayoutPath) {
      serverEntries['layout'] = rootLayoutPath;
    }

    // 添加 not-found 页面
    const notFoundPath = router.getNotFoundPath();
    if (notFoundPath) {
      serverEntries['not-found'] = notFoundPath;
    }

    // 扫描所有 app 目录文件（包括 layouts, errors, loadings）
    async function collectAppFiles(dir: string): Promise<void> {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          await collectAppFiles(fullPath);
        } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
          const relativePath = fullPath.replace(rootDir + '/', '');
          const entryName = relativePath
            .replace(/\//g, '_')
            .replace(/\.(tsx?|jsx?)$/, '');
          if (!serverEntries[entryName]) {
            serverEntries[entryName] = fullPath;
          }
        }
      }
    }

    await collectAppFiles(appDir);

    console.log(
      pc.dim(`    Found ${Object.keys(serverEntries).length} server entries`)
    );

    await viteBuild({
      root: rootDir,
      plugins: lastVitePlugin(),
      build: {
        outDir: join(outDir, 'server'),
        emptyOutDir: true,
        ssr: true,
        rollupOptions: {
          input: serverEntries,
          output: {
            entryFileNames: '[name].js',
            chunkFileNames: 'chunks/[name]-[hash].js',
          },
        },
      },
      ssr: {
        noExternal: true,
      },
    });

    // 5. 复制 public 目录（如果存在）
    const publicDir = join(rootDir, 'public');
    if (existsSync(publicDir)) {
      console.log(pc.dim('  Copying public assets...'));
      await copyDir(publicDir, join(outDir, 'client'));
    }

    // 6. 生成路由信息
    const routeInfo = {
      routes: routes.map((r) => ({
        path: r.path,
        filePath: r.filePath.replace(rootDir, ''),
      })),
      notFoundPath: router.getNotFoundPath()?.replace(rootDir, ''),
      rootLayoutPath: router.getRootLayoutPath()?.replace(rootDir, ''),
    };
    await writeFile(
      join(outDir, 'routes.json'),
      JSON.stringify(routeInfo, null, 2)
    );

    // 7. 生成生产服务器入口
    const serverScript = generateServerScript(appDir);
    await writeFile(join(outDir, 'server.js'), serverScript);

    // 8. 生成 package.json
    const packageJson = {
      type: 'module',
      scripts: {
        start: 'node server.js',
      },
    };
    await writeFile(
      join(outDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    console.log(pc.green('\n✓ Build completed successfully!\n'));
    console.log(pc.dim(`  Output: ${outDir}`));
    console.log(pc.dim(`  Server: ${join(outDir, 'server')}`));
    console.log(pc.dim(`  Client: ${join(outDir, 'client')}\n`));
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
 * 生成生产服务器脚本
 */
function generateServerScript(_appDir: string): string {
  return `#!/usr/bin/env node
/**
 * Last.js Production Server
 *
 * This file is auto-generated by the build process.
 * Do not edit manually.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startProductionServer } from 'lastjs/server';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 启动生产服务器
// appDir 应该指向原始的 app 目录，而不是构建输出目录
// 从 .lastjs 目录来看，app 目录在 ../app
startProductionServer({
  buildDir: __dirname,
  appDir: join(__dirname, '../app'),
  port: parseInt(process.env.PORT || '3000', 10),
}).catch((error) => {
  console.error('Failed to start production server:', error);
  process.exit(1);
});
`;
}

/**
 * 复制目录
 */
async function copyDir(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
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
