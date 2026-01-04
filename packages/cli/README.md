# @lastjs/cli

CLI tools for Last.js framework.

## Installation

```bash
pnpm add @lastjs/cli
```

## Usage

### As a binary

```bash
lastjs dev        # Start development server
lastjs build      # Build for production
lastjs start      # Start production server
```

### Programmatic API

```ts
import { runCLI } from '@lastjs/cli';

runCLI(['dev', '--port', '3000']);
```

## Commands

- `dev [options]` - Start development server
  - `-p, --port <port>` - Port to run the server on (default: 3000)
- `build` - Build for production
- `start [options]` - Start production server
  - `-p, --port <port>` - Port to run the server on (default: 3000)

## License

MIT

