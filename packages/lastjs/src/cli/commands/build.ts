import { join } from 'pathe';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { build as viteBuild } from 'vite';
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
 * 构建生产版本 (RSC 模式)
 */
export async function build(options: BuildCommandOptions): Promise<void> {
  const rootDir = process.cwd();
  const appDir = join(rootDir, 'app');
  const outDir = options.outDir || join(rootDir, '.lastjs');

  console.log(pc.cyan('🔨 Building Last.js application (RSC mode)...\n'));

  try {
    // 1. 清理并创建输出目录
    console.log(pc.dim('  Preparing output directory...'));
    await mkdir(outDir, { recursive: true });

    // 2. 使用 @vitejs/plugin-rsc 进行构建
    console.log(pc.dim('  Building with RSC...'));

    await viteBuild({
      root: rootDir,
      plugins: [createRscVirtualPlugin(appDir), rsc(), react()],
      environments: {
        rsc: {
          build: {
            outDir: join(outDir, 'rsc'),
            rollupOptions: {
              input: {
                index: VIRTUAL_RSC_ENTRY,
              },
            },
          },
        },
        ssr: {
          build: {
            outDir: join(outDir, 'ssr'),
            rollupOptions: {
              input: {
                index: VIRTUAL_SSR_ENTRY,
              },
            },
          },
        },
        client: {
          build: {
            outDir: join(outDir, 'client'),
            rollupOptions: {
              input: {
                index: VIRTUAL_BROWSER_ENTRY,
              },
            },
          },
        },
      },
      logLevel: 'info',
    });

    // 3. 复制 public 目录（如果存在）
    const publicDir = join(rootDir, 'public');
    if (existsSync(publicDir)) {
      console.log(pc.dim('  Copying public assets...'));
      await copyDir(publicDir, join(outDir, 'client'));
    }

    // 4. 生成服务器启动脚本
    const serverScript = `
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 动态导入构建后的 RSC handler
const rscModule = await import('./rsc/index.js');
const handler = rscModule.default;

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', \`http://\${req.headers.host}\`);
  
  // 静态文件处理
  if (url.pathname.startsWith('/assets/')) {
    const filePath = join(__dirname, 'client', url.pathname);
    try {
      const content = await readFile(filePath);
      const ext = url.pathname.split('.').pop();
      const mimeTypes = {
        js: 'application/javascript',
        css: 'text/css',
        html: 'text/html',
        json: 'application/json',
        png: 'image/png',
        jpg: 'image/jpeg',
        svg: 'image/svg+xml',
      };
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.end(content);
      return;
    } catch (e) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }
  }
  
  // RSC 处理
  try {
    const request = new Request(url.toString(), {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])
      ),
    });
    
    const response = await handler(request);
    
    res.statusCode = response.status;
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    
    const body = await response.text();
    res.end(body);
  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(\`Server running on http://localhost:\${port}\`);
});
`;

    await writeFile(join(outDir, 'server.js'), serverScript);

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
