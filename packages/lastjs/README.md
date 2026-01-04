# lastjs

A minimal Next.js alternative with App Router and SSR.

## Installation

```bash
pnpm add lastjs react react-dom
```

## Quick Start

Create a new project:

```bash
mkdir my-app
cd my-app
pnpm init
pnpm add lastjs react react-dom
```

Create `app/page.tsx`:

```tsx
export default function HomePage() {
  return <h1>Hello Last.js!</h1>;
}
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "lastjs dev",
    "build": "lastjs build",
    "start": "lastjs start"
  }
}
```

Start development:

```bash
pnpm dev
```

## Features

- ✅ File-system based App Router
- ✅ Server-Side Rendering (SSR)
- ✅ React 19 Support
- ✅ Dynamic Routes `[slug]`
- ✅ TypeScript Support
- ✅ Powered by Vite + Nitro

## Package Structure

This is the main package that aggregates all sub-packages:

- `@lastjs/core` - Core routing and rendering
- `@lastjs/cli` - CLI tools
- `@lastjs/nitro` - Nitro server integration
- `@lastjs/vite` - Vite build plugin

## Advanced Usage

You can also import sub-packages directly:

```ts
// Import from main package (recommended)
import { FileSystemRouter } from 'lastjs';

// Or import from sub-packages
import { FileSystemRouter } from '@lastjs/core';
import { lastVitePlugin } from '@lastjs/vite';
```

## Documentation

See the [documentation](../../.docs) for more information.

## License

MIT
