import { join } from 'pathe';
import { mkdir, writeFile, readdir, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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
    await viteBuild({
      root: rootDir,
      plugins: lastVitePlugin(),
      build: {
        outDir: join(outDir, 'client'),
        emptyOutDir: true,
        rollupOptions: {
          input: {
            client: join(rootDir, 'app/layout.tsx'),
          },
          output: {
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]',
          },
        },
        manifest: true,
      },
    });

    // 4. 构建 SSR bundle
    console.log(pc.dim('  Building server bundle...'));
    await viteBuild({
      root: rootDir,
      plugins: lastVitePlugin(),
      build: {
        outDir: join(outDir, 'server'),
        emptyOutDir: true,
        ssr: true,
        rollupOptions: {
          input: {
            server: join(rootDir, 'app/layout.tsx'),
          },
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
    const serverScript = generateServerScript();
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
function generateServerScript(): string {
  return `
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// MIME 类型映射
const mimeTypes = {
  js: 'application/javascript',
  mjs: 'application/javascript',
  css: 'text/css',
  html: 'text/html',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  eot: 'application/vnd.ms-fontobject',
};

// 读取路由信息
const routesData = JSON.parse(
  await readFile(join(__dirname, 'routes.json'), 'utf-8')
);

// 读取客户端 manifest
let clientManifest = {};
const manifestPath = join(__dirname, 'client/.vite/manifest.json');
if (existsSync(manifestPath)) {
  clientManifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
}

// 获取客户端入口脚本
function getClientScript() {
  for (const [key, value] of Object.entries(clientManifest)) {
    if (value.isEntry) {
      return '/assets/' + value.file.split('/').pop();
    }
  }
  return null;
}

const clientScript = getClientScript();

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', \`http://\${req.headers.host}\`);

  // 静态文件处理
  if (url.pathname.startsWith('/assets/') ||
      url.pathname.match(/\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    const filePath = join(__dirname, 'client', url.pathname);

    if (existsSync(filePath)) {
      try {
        const content = await readFile(filePath);
        const ext = url.pathname.split('.').pop() || '';
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.end(content);
        return;
      } catch (e) {
        // 继续到页面处理
      }
    }
  }

  // 页面渲染
  try {
    // 动态导入服务端模块
    const serverModule = await import('./server/server.js');
    
    // 简单的 HTML 响应（生产环境需要更完整的实现）
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(\`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Last.js App</title>
        </head>
        <body>
          <div id="__lastjs">
            <h1>Last.js Production Server</h1>
            <p>Production SSR rendering is being set up...</p>
            <p>Routes: \${routesData.routes.length}</p>
          </div>
          \${clientScript ? \`<script type="module" src="\${clientScript}"></script>\` : ''}
        </body>
      </html>
    \`);
  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(\`
      <!DOCTYPE html>
      <html>
        <head><title>500 - Server Error</title></head>
        <body>
          <h1>500 - Internal Server Error</h1>
          <p>\${error instanceof Error ? error.message : 'Unknown error'}</p>
        </body>
      </html>
    \`);
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(\`\\n🚀 Last.js production server running on http://localhost:\${port}\\n\`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\\n⏳ Shutting down...');
  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
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
