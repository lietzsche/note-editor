export function ok<T>(data: T) {
  return Response.json({ data }, { status: 200 });
}

export function created<T>(data: T) {
  return Response.json({ data }, { status: 201 });
}

export function noContent() {
  return new Response(null, { status: 204 });
}

export function err(code: string, message: string, status = 400) {
  return Response.json({ error: { code, message } }, { status });
}

export const unauthorized = () => err("UNAUTHORIZED", "인증이 필요합니다.", 401);
export const notFound = () => err("NOT_FOUND", "리소스를 찾을 수 없습니다.", 404);
export const forbidden = () => err("FORBIDDEN", "접근 권한이 없습니다.", 403);
