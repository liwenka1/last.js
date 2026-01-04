# @lastjs/core

Core functionality for Last.js - file-system routing and SSR rendering.

## Installation

```bash
pnpm add @lastjs/core react react-dom
```

## Usage

### File System Router

```ts
import { FileSystemRouter } from '@lastjs/core';

const router = new FileSystemRouter('./app');
await router.scan();

const match = router.match('/blog/hello-world');
if (match) {
  console.log(match.route, match.params);
}
```

### SSR Rendering

```ts
import { renderToStream } from '@lastjs/core';
import { createElement } from 'react';

const element = createElement(MyComponent, props);
const stream = renderToStream(element, {
  onShellReady() {
    stream.pipe(response);
  },
});
```

## Exports

- `FileSystemRouter` - File-system based router
- `renderToStream` - SSR rendering function
- Types: `RouteNode`, `RouteMatch`, `RouteModule`, `Metadata`

## License

MIT

