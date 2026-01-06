# Last.js

A minimal Next.js alternative with App Router, SSR, and Streaming.

## Features

- ✅ **File-system based App Router** - Next.js style routing
- ✅ **Server-Side Rendering (SSR)** - Full SSR with streaming support
- ✅ **Streaming with Suspense** - Progressive HTML delivery
- ✅ **Async Components** - Use async/await directly in components
- ✅ **Client-side Hydration** - Seamless server-to-client transition
- ✅ **Dynamic Routes** - `[slug]` and `[...slug]` patterns
- ✅ **Nested Layouts** - Shared layouts with `layout.tsx`
- ✅ **Loading States** - `loading.tsx` with Suspense
- ✅ **Error Handling** - `error.tsx` with Error Boundaries
- ✅ **TypeScript** - Full TypeScript support
- ✅ **Powered by Vite** - Lightning fast development

## Architecture: RSC-aware SSR

Last.js uses an **RSC-aware SSR** architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      Last.js Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Server Components (default)                                │
│  ├─ All components render on server by default             │
│  ├─ Support async/await for data fetching                  │
│  └─ Streaming with Suspense boundaries                     │
│                                                             │
│  Client Components ('use client')                           │
│  ├─ Marked with 'use client' directive                     │
│  ├─ Hydrated on client for interactivity                   │
│  └─ Can use hooks (useState, useEffect, etc.)              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Installation

```bash
pnpm add lastjs react react-dom
```

## Quick Start

1. Create a new project:

```bash
mkdir my-app
cd my-app
pnpm init
pnpm add lastjs react react-dom
```

2. Create `app/layout.tsx`:

```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

3. Create `app/page.tsx`:

```tsx
export default function HomePage() {
  return <h1>Hello Last.js!</h1>;
}
```

4. Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "lastjs dev",
    "build": "lastjs build",
    "start": "lastjs start"
  }
}
```

5. Start development:

```bash
pnpm dev
```

## Examples

### Server Component (default)

```tsx
// app/page.tsx - Server Component
export default function Page() {
  // This runs on the server
  const data = getServerData();
  return <div>{data}</div>;
}
```

### Async Component with Streaming

```tsx
// app/page.tsx
import { Suspense } from 'react';

async function AsyncData() {
  const data = await fetchData(); // Runs on server
  return <div>{data}</div>;
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <AsyncData />
    </Suspense>
  );
}
```

### Client Component

```tsx
// app/components/Counter.tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
```

### Dynamic Routes

```tsx
// app/blog/[slug]/page.tsx
export default function BlogPost({ params }: { params: { slug: string } }) {
  return <h1>Post: {params.slug}</h1>;
}
```

### Metadata

```tsx
// Static metadata
export const metadata = {
  title: 'My Page',
  description: 'Page description',
};

// Dynamic metadata
export async function generateMetadata({ params }) {
  return {
    title: `Post: ${params.slug}`,
  };
}
```

## File Conventions

| File            | Description                    |
| --------------- | ------------------------------ |
| `page.tsx`      | Page component                 |
| `layout.tsx`    | Shared layout                  |
| `loading.tsx`   | Loading UI (Suspense fallback) |
| `error.tsx`     | Error UI (Error Boundary)      |
| `not-found.tsx` | 404 page                       |

## Client Hooks

```tsx
'use client';

import {
  useRouter,
  usePathname,
  useParams,
  useSearchParams,
} from 'lastjs/client';

function MyComponent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();

  return <button onClick={() => router.push('/about')}>Go to About</button>;
}
```

## Link Component

```tsx
import { Link } from 'lastjs/client';

<Link href="/about">About</Link>
<Link href="/blog" prefetch={false}>Blog</Link>
<Link href="/login" replace>Login</Link>
```

## License

MIT
