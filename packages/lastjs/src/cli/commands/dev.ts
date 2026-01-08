import { join } from 'pathe';
import pc from 'picocolors';
import { createServer as createViteServer } from 'vite';
import { lastVitePlugin } from '../../vite/plugin.js';

export interface DevCommandOptions {
  port: number;
}

export async function dev(options: DevCommandOptions): Promise<void> {
  console.log('[dev] Function called with options:', options);
  const rootDir = process.cwd();
  const appDir = join(rootDir, 'app');
  console.log('[dev] Directories:', { rootDir, appDir });

  console.log(pc.cyan('\n🚀 Starting Last.js development server...\n'));
  console.log(pc.magenta('  Mode: RSC with Streaming\n'));
  console.log(pc.dim(`  Root: ${rootDir}`));
  console.log(pc.dim(`  App: ${appDir}\n`));

  try {
    console.log(pc.dim('[1/3] Creating Vite server...'));
    console.log('[dev] About to call lastVitePlugin...');
    const plugins = lastVitePlugin({ appDir, rootDir });
    console.log('[dev] lastVitePlugin returned, plugin count:', plugins.length);
    
    console.log('[dev] About to call createViteServer...');
    // 创建并启动 Vite 开发服务器
    // configureServer hook 会自动配置中间件
    const vite = await createViteServer({
      root: rootDir,
      server: {
        port: options.port,
        strictPort: true,
        hmr: {
          port: options.port + 1,
        },
      },
      plugins,
      logLevel: 'info',
    });
    console.log('[dev] createViteServer completed');

    console.log(pc.dim('[2/3] Starting server...'));
    await vite.listen();
    console.log(pc.dim('[3/3] Server listening...'));

    console.log(
      pc.green(
        `\n✓ Server ready on ${pc.bold(`http://localhost:${options.port}`)}\n`
      )
    );
    console.log(pc.dim(`  App directory: ${appDir}\n`));

    // 监听进程退出
    const cleanup = async () => {
      console.log(pc.yellow('\n\n⏳ Shutting down...'));
      await vite.close();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (error) {
    console.error(pc.red('\n✗ Failed to start development server:\n'));
    console.error(error);
    process.exit(1);
  }
}
