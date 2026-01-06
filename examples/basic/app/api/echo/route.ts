/**
 * POST /api/echo
 */
export async function POST(request: Request) {
  const body = await request.json();

  return Response.json({
    received: body,
    timestamp: new Date().toISOString(),
    method: 'POST',
  });
}
