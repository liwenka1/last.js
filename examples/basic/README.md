# Last.js Basic Example

这是一个最小的 Last.js 应用示例，展示了核心功能。

## 功能演示

- ✅ **根布局** (`app/layout.tsx`) - 全局布局和 metadata
- ✅ **首页** (`app/page.tsx`) - 静态页面
- ✅ **关于页** (`app/about/page.tsx`) - 嵌套路由
- ✅ **博客详情** (`app/blog/[slug]/page.tsx`) - 动态路由

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 访问 http://localhost:3000
```

## 构建

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 项目结构

```
app/
├── layout.tsx          # 根布局
├── page.tsx            # 首页 (/)
├── about/
│   └── page.tsx        # 关于页 (/about)
└── blog/
    └── [slug]/
        └── page.tsx    # 博客详情 (/blog/:slug)
```

## 路由约定

Last.js 使用文件系统路由，类似 Next.js App Router：

- `page.tsx` - 定义页面组件
- `layout.tsx` - 定义布局组件
- `[param]` - 动态路由参数
- `[...slug]` - Catch-all 路由

## Metadata

支持两种方式定义 metadata：

```tsx
// 静态 metadata
export const metadata = {
  title: 'My Page',
  description: 'Page description',
};

// 动态 metadata
export async function generateMetadata({ params }) {
  return {
    title: `Post: ${params.slug}`,
  };
}
```

