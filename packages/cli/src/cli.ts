#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { join } from 'pathe';

const program = new Command();

program
  .name('lastjs')
  .description('A minimal Next.js alternative with App Router and SSR')
  .version('0.1.0');

program
  .command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Port to run the server on', '3000')
  .action(async (options) => {
    console.log(pc.cyan('🚀 Starting Last.js development server...'));
    console.log(pc.dim(`   Port: ${options.port}`));

    const appDir = join(process.cwd(), 'app');

    // TODO: Implement dev server with Vite + Nitro
    console.log(pc.yellow('⚠️  Dev server not implemented yet'));
    console.log(pc.dim(`   App directory: ${appDir}`));
  });

program
  .command('build')
  .description('Build for production')
  .action(async () => {
    console.log(pc.cyan('📦 Building Last.js application...'));

    const appDir = join(process.cwd(), 'app');

    // TODO: Implement build with Vite + Nitro
    console.log(pc.yellow('⚠️  Build not implemented yet'));
    console.log(pc.dim(`   App directory: ${appDir}`));
  });

program
  .command('start')
  .description('Start production server')
  .option('-p, --port <port>', 'Port to run the server on', '3000')
  .action(async (options) => {
    console.log(pc.green('▲ Starting Last.js production server...'));
    console.log(pc.dim(`   Port: ${options.port}`));

    // TODO: Implement production server
    console.log(pc.yellow('⚠️  Production server not implemented yet'));
  });

export function runCLI(argv?: string[]) {
  program.parse(argv);
}

// Run CLI if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI();
}
