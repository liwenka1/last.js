import { join } from 'pathe';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { spawn } from 'node:child_process';

export interface StartCommandOptions {
  port: number;
}

/**
 * 启动生产服务器 (RSC 模式)
 */
export async function start(options: StartCommandOptions): Promise<void> {
  const { port } = options;
  const rootDir = process.cwd();
  const outDir = join(rootDir, '.lastjs');
  const serverScript = join(outDir, 'server.js');

  console.log(pc.cyan('🚀 Starting Last.js production server...\n'));

  // 检查构建产物是否存在
  if (!existsSync(outDir)) {
    console.error(pc.red('✗ Build output not found.'));
    console.error(pc.dim('  Run `lastjs build` first.\n'));
    process.exit(1);
  }

  if (!existsSync(serverScript)) {
    console.error(pc.red('✗ Server script not found.'));
    console.error(pc.dim('  Run `lastjs build` first.\n'));
    process.exit(1);
  }

  // 启动服务器
  const child = spawn('node', [serverScript], {
    cwd: outDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'production',
    },
  });

  child.on('error', (error) => {
    console.error(pc.red('\n✗ Failed to start server:\n'));
    console.error(error);
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(pc.red(`\n✗ Server exited with code ${code}\n`));
      process.exit(code);
    }
  });

  // 监听退出信号
  const cleanup = () => {
    child.kill('SIGTERM');
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}
