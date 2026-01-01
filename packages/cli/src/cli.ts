#!/usr/bin/env node
import { join } from 'path';
import { createServer } from '@last/core';

const command = process.argv[2];

async function dev() {
  const appDir = join(process.cwd(), 'app');
  const server = await createServer({ appDir, port: 3000 });
  await server.listen();
}

async function main() {
  switch (command) {
    case 'dev':
      await dev();
      break;
    default:
      console.log('Usage: last <command>');
      console.log('Commands:');
      console.log('  dev    Start development server');
      process.exit(1);
  }
}

main().catch(console.error);
