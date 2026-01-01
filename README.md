# Last.js

一个对标 Next.js 的最小化框架，专注于 App Router 和 SSR 核心功能。

## 特性

- ✅ 基于文件系统的 App Router
- ✅ 服务端渲染 (SSR)
- ✅ React 19 支持
- ✅ React Compiler 集成
- ✅ 动态路由 `[slug]` 和 catch-all `[...slug]`
- ✅ TypeScript 支持

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000

## 项目结构

```
last.js/
├── packages/
│   ├── core/       # 核心路由和 SSR 引擎
│   └── cli/        # CLI 工具
└── examples/
    └── basic/      # 示例应用
        └── app/    # App Router 目录
```

## App Router 约定

- `app/page.tsx` - 首页
- `app/about/page.tsx` - /about 路由
- `app/blog/[slug]/page.tsx` - 动态路由 /blog/:slug

## 技术栈

- React 19
- TypeScript
- Node.js
- React Compiler (Babel plugin)
