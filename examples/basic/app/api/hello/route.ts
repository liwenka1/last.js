/**
 * GET /api/hello
 */
export async function GET() {
  return Response.json({
    message: 'Hello from Last.js API! 🚀',
    timestamp: new Date().toISOString(),
  });
}
