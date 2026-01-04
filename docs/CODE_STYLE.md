# 代码风格指南

本文档详细说明了 Last.js 项目的代码风格配置。

## 配置文件概览

### ESLint 配置

**文件：** `eslint.config.mjs`

使用 ESLint 9 的 flat config 格式，配置包括：

- ✅ JavaScript 基础规则
- ✅ TypeScript 支持（`@typescript-eslint`）
- ✅ React 19 支持（`eslint-plugin-react`）
- ✅ React Hooks 规则（`eslint-plugin-react-hooks`）
- ✅ Prettier 集成（`eslint-config-prettier`）

**主要规则：**

- 未使用的变量会警告（以 `_` 开头的除外）
- 推荐使用 `type` 导入类型
- `any` 类型会警告
- 禁止使用 `var`
- 推荐使用 `const`

### Prettier 配置

**文件：** `.prettierrc`

```json
{
  "semi": true,              // 使用分号
  "trailingComma": "es5",    // ES5 兼容的尾随逗号
  "singleQuote": true,       // 使用单引号
  "printWidth": 80,          // 每行最多 80 字符
  "tabWidth": 2,             // 2 空格缩进
  "useTabs": false,          // 使用空格而不是 tab
  "endOfLine": "lf",         // Unix 风格换行符
  "arrowParens": "always",   // 箭头函数参数总是使用括号
  "bracketSpacing": true,    // 对象字面量的括号间距
  "jsxSingleQuote": false,   // JSX 使用双引号
  "quoteProps": "as-needed"  // 仅在需要时给对象属性加引号
}
```

### EditorConfig

**文件：** `.editorconfig`

统一不同编辑器的基础配置：

- UTF-8 编码
- LF 换行符
- 2 空格缩进
- 文件末尾插入空行
- 删除行尾空格

### VSCode 配置

**文件：** `.vscode/settings.json`

项目级 VSCode 设置：

- 保存时自动格式化（Prettier）
- 保存时自动修复 ESLint 错误
- 使用工作区的 TypeScript 版本

**推荐扩展：** `.vscode/extensions.json`

- ESLint
- Prettier
- EditorConfig

## 使用方法

### 命令行

```bash
# 检查代码质量
pnpm lint

# 自动修复 ESLint 问题
pnpm lint:fix

# 检查代码格式
pnpm format:check

# 自动格式化代码
pnpm format

# 类型检查
pnpm typecheck
```

### Git Hooks（可选）

可以使用 `husky` 和 `lint-staged` 在提交前自动检查：

```bash
# 安装 husky 和 lint-staged
pnpm add -D husky lint-staged

# 初始化 husky
pnpm exec husky init

# 配置 pre-commit hook
echo "pnpm exec lint-staged" > .husky/pre-commit
```

在 `package.json` 中添加：

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

## 代码示例

### ✅ 好的代码

```typescript
import type { RouteNode } from './types';

export const createRouter = (appDir: string): RouteNode => {
  const router = {
    segment: '',
    path: '/',
    type: 'static' as const,
    files: {},
    children: new Map(),
  };

  return router;
};
```

### ❌ 不好的代码

```typescript
// 没有使用 type 导入
import { RouteNode } from './types';

// 使用 var
var router = {
  segment: '',
  path: '/',
  type: 'static',
  files: {},
  children: new Map(),
};

// 没有类型注解
export const createRouter = (appDir) => {
  return router;
};
```

## React 组件示例

### ✅ 好的代码

```tsx
import type { FC } from 'react';

interface Props {
  title: string;
  description?: string;
}

export const PageHeader: FC<Props> = ({ title, description }) => {
  return (
    <header>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
};
```

### ❌ 不好的代码

```tsx
// 没有类型定义
export const PageHeader = ({ title, description }) => {
  return (
    <header>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
};
```

## 忽略文件

### `.prettierignore`

Prettier 会忽略：

- `node_modules/`
- `dist/`、`build/`
- `.next/`、`.output/`、`.nitro/`
- 日志文件
- 锁文件

### ESLint 忽略

在 `eslint.config.mjs` 的 `ignores` 字段中配置：

- `node_modules/`
- `dist/`、`build/`
- 配置文件（`*.config.js`）

## 常见问题

### Q: 为什么使用单引号？

A: 单引号在 JavaScript/TypeScript 中更常见，且不需要按 Shift 键。JSX 属性使用双引号以区分。

### Q: 为什么限制每行 80 字符？

A: 便于在多窗口并排查看代码，也是传统编程的最佳实践。

### Q: 如何处理特殊情况？

A: 使用 ESLint 注释临时禁用规则：

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = unknownData;
```

或使用 Prettier 注释：

```typescript
// prettier-ignore
const matrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
```

## 更新配置

如需调整规则：

1. 修改 `eslint.config.mjs` 或 `.prettierrc`
2. 运行 `pnpm format` 和 `pnpm lint:fix` 更新所有文件
3. 提交更改并通知团队

## 参考资源

- [ESLint 文档](https://eslint.org/)
- [Prettier 文档](https://prettier.io/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [React ESLint Plugin](https://github.com/jsx-eslint/eslint-plugin-react)
- [EditorConfig](https://editorconfig.org/)


