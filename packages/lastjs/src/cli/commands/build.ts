import { join } from 'pathe';
import { mkdir, writeFile, readdir, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { createBuilder, type Plugin } from 'vite';
import rsc from '@vitejs/plugin-rsc';
import react from '@vitejs/plugin-react';
import {
  createRscVirtualPlugin,
  VIRTUAL_RSC_ENTRY,
  VIRTUAL_SSR_ENTRY,
  VIRTUAL_BROWSER_ENTRY,
} from '../../rsc/virtual-entries.js';

export interface BuildCommandOptions {
  /** 输出目录 */
  outDir?: string;
}

/**
 * 创建框架配置插件
 * 处理 @vitejs/plugin-rsc 作为框架依赖时的路径问题
 * 参考: https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/README.md
 */
function createLastjsConfigPlugin(): Plugin {
  return {
    name: 'lastjs:config',
    configEnvironment(_name, config) {
      // 重写 optimizeDeps.include 路径，使其通过 lastjs 解析
      if (config.optimizeDeps?.include) {
        config.optimizeDeps.include = config.optimizeDeps.include.map(
          (entry) => {
            if (entry.startsWith('@vitejs/plugin-rsc')) {
              return `lastjs > ${entry}`;
            }
            return entry;
          }
        );
      }
    },
  };
}

/**
 * 构建生产版本 (RSC 模式)
 * 使用 Vite Builder API 来正确控制构建顺序
 */
export async function build(options: BuildCommandOptions): Promise<void> {
  const rootDir = process.cwd();
  const appDir = join(rootDir, 'app');
  const outDir = options.outDir || join(rootDir, '.lastjs');

  console.log(pc.cyan('🔨 Building Last.js application (RSC mode)...\n'));

  try {
    // 1. 清理并创建输出目录
    console.log(pc.dim('  Preparing output directory...'));
    if (existsSync(outDir)) {
      await rm(outDir, { recursive: true, force: true });
    }
    await mkdir(outDir, { recursive: true });

    // 2. 使用 Vite Builder API 进行构建
    // @vitejs/plugin-rsc 需要使用 builder API 来控制构建顺序
    console.log(pc.dim('  Creating build configuration...'));

    const builder = await createBuilder({
      root: rootDir,
      plugins: [
        // 框架配置插件（处理依赖路径）
        createLastjsConfigPlugin(),
        // RSC 虚拟入口插件
        createRscVirtualPlugin(appDir),
        // @vitejs/plugin-rsc - 它会自动处理构建顺序
        rsc(),
        // React 插件
        react(),
      ],
      environments: {
        rsc: {
          build: {
            outDir: join(outDir, 'rsc'),
            emptyOutDir: true,
            rollupOptions: {
              input: {
                index: VIRTUAL_RSC_ENTRY,
              },
              output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'chunks/[name]-[hash].js',
              },
            },
          },
        },
        ssr: {
          build: {
            outDir: join(outDir, 'ssr'),
            emptyOutDir: true,
            rollupOptions: {
              input: {
                index: VIRTUAL_SSR_ENTRY,
              },
              output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'chunks/[name]-[hash].js',
              },
            },
          },
        },
        client: {
          build: {
            outDir: join(outDir, 'client'),
            emptyOutDir: true,
            rollupOptions: {
              input: {
                index: VIRTUAL_BROWSER_ENTRY,
              },
              output: {
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]',
              },
            },
          },
        },
      },
      logLevel: 'info',
    });

    // 3. 使用 builder.buildApp() 让 @vitejs/plugin-rsc 控制构建顺序
    console.log(pc.dim('  Building with RSC...'));
    await builder.buildApp();

    // 4. 复制 public 目录（如果存在）
    const publicDir = join(rootDir, 'public');
    if (existsSync(publicDir)) {
      console.log(pc.dim('  Copying public assets...'));
      await copyDir(publicDir, join(outDir, 'client'));
    }

    // 5. 生成生产服务器入口
    const serverScript = generateServerScript();
    await writeFile(join(outDir, 'server.js'), serverScript);

    // 6. 生成 package.json
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
    console.log(pc.dim(`  RSC: ${join(outDir, 'rsc')}`));
    console.log(pc.dim(`  SSR: ${join(outDir, 'ssr')}`));
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

// 导入构建后的 RSC handler
const rscModule = await import('./rsc/index.js');
const handler = rscModule.default;

if (typeof handler !== 'function') {
  console.error('Error: RSC handler is not a function');
  process.exit(1);
}

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
        // 继续到 RSC 处理
      }
    }
  }

  // RSC 处理
  try {
    // 构建 Request 对象
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        headers.set(key, Array.isArray(value) ? value[0] : value);
      }
    }

    const request = new Request(url.toString(), {
      method: req.method || 'GET',
      headers,
    });

    // 调用 RSC handler
    const response = await handler(request);

    // 设置响应
    res.statusCode = response.status;
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }

    // 处理流式响应
    if (response.body) {
      const reader = response.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };
      await pump();
    } else {
      const body = await response.text();
      res.end(body);
    }
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
