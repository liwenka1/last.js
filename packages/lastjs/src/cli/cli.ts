#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';

/**
 * @vitejs/plugin-rsc 已经在内部处理了 react-server 条件
 * 不需要在 CLI 层面手动设置
 */

export async function runCLI(): Promise<void> {
  console.log('[CLI] Starting...');
  const program = new Command();

  program
    .name('lastjs')
    .description('A minimal Next.js-like framework')
    .version('0.1.0');

  program
    .command('dev')
    .description('Start development server')
    .option('-p, --port <port>', 'Port to listen on', '3000')
    .action(async (options) => {
      const { dev } = await import('./commands/dev.js');
      await dev({ port: parseInt(options.port) });
    });

  program
    .command('build')
    .description('Build for production')
    .action(async () => {
      const { build } = await import('./commands/build.js');
      await build({});
    });

  program
    .command('start')
    .description('Start production server')
    .option('-p, --port <port>', 'Port to listen on', '3000')
    .action(async (options) => {
      const { start } = await import('./commands/start.js');
      await start({ port: parseInt(options.port) });
    });

  await program.parseAsync();
}

// 直接运行 CLI
runCLI().catch((error) => {
  console.error(pc.red('Error:'), error);
  process.exit(1);
});
