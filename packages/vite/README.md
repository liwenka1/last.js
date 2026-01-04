# @lastjs/vite

Vite plugin for Last.js.

## Installation

```bash
pnpm add @lastjs/vite
```

## Usage

```ts
import { defineConfig } from 'vite';
import { lastVitePlugin } from '@lastjs/vite';

export default defineConfig({
  plugins: [
    lastVitePlugin({
      appDir: 'app',
    }),
  ],
});
```

## Exports

- `lastVitePlugin` - Vite plugin for Last.js
- Types: `LastVitePluginOptions`

## License

MIT

