# @lastjs/nitro

Nitro server integration for Last.js.

## Installation

```bash
pnpm add @lastjs/nitro
```

## Usage

```ts
import { createNitroConfig } from '@lastjs/nitro';

const config = createNitroConfig({
  appDir: './app',
  port: 3000,
  dev: true,
});
```

## Exports

- `createNitroConfig` - Create Nitro configuration
- Types: `LastNitroOptions`

## License

MIT

