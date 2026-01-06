/**
 * GET /api/users/:id
 */
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' },
];

export async function GET(request: Request) {
  // 从 request 对象获取路由参数
  const params = (request as any).params;
  const id = Number(params?.id);

  const user = users.find((u) => u.id === id);

  if (!user) {
    return Response.json({ error: `User not found: ${id}` }, { status: 404 });
  }

  return Response.json(user);
}
