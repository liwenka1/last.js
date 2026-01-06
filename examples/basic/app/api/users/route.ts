/**
 * GET /api/users
 */
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com' },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = url.searchParams.get('limit');
  const limitNum = limit ? Number(limit) : users.length;

  return Response.json({
    users: users.slice(0, limitNum),
    total: users.length,
  });
}
