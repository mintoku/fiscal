import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";

export const DEMO_USER_ID = "demo";

export function json(
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function getUserId(event: APIGatewayProxyEventV2): string {
  const header =
    event.headers["x-user-id"] ?? event.headers["X-User-Id"] ?? "";
  const trimmed = header.trim();
  return trimmed || process.env.DEFAULT_USER_ID || DEMO_USER_ID;
}

export function parseJsonBody<T>(event: APIGatewayProxyEventV2): T | null {
  if (!event.body) return null;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
