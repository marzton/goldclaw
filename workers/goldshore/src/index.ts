export interface Env {
  GOLDSHORE_KV: KVNamespace;
  ENVIRONMENT: string;
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type"
};

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...init.headers
    }
  });
}

function keyFromPath(pathname: string): string | null {
  if (!pathname.startsWith("/kv/")) {
    return null;
  }

  const encodedKey = pathname.slice("/kv/".length);
  return encodedKey.length > 0 ? decodeURIComponent(encodedKey) : null;
}

async function bodyValue(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return request.text();
  }

  const body = (await request.json()) as { value?: unknown };
  if (Object.prototype.hasOwnProperty.call(body, "value")) {
    return typeof body.value === "string" ? body.value : JSON.stringify(body.value);
  }

  return JSON.stringify(body);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({
        service: "goldshore",
        environment: env.ENVIRONMENT,
        kvBinding: "GOLDSHORE_KV",
        routes: [
          "GET /kv?prefix=optional-prefix",
          "GET /kv/:key",
          "PUT /kv/:key",
          "POST /kv/:key",
          "DELETE /kv/:key"
        ]
      });
    }

    if (url.pathname === "/kv" && request.method === "GET") {
      const list = await env.GOLDSHORE_KV.list({
        prefix: url.searchParams.get("prefix") ?? undefined,
        cursor: url.searchParams.get("cursor") ?? undefined
      });

      const response: {
        keys: typeof list.keys;
        list_complete: boolean;
        cursor?: string;
      } = {
        keys: list.keys,
        list_complete: list.list_complete
      };

      if (!list.list_complete) {
        response.cursor = list.cursor;
      }

      return json(response);
    }

    const key = keyFromPath(url.pathname);
    if (!key) {
      return json({ error: "Not found" }, { status: 404 });
    }

    if (request.method === "GET") {
      const value = await env.GOLDSHORE_KV.get(key);
      if (value === null) {
        return json({ key, value: null }, { status: 404 });
      }

      return json({ key, value });
    }

    if (request.method === "PUT" || request.method === "POST") {
      const value = await bodyValue(request);
      await env.GOLDSHORE_KV.put(key, value);
      return json({ key, stored: true });
    }

    if (request.method === "DELETE") {
      await env.GOLDSHORE_KV.delete(key);
      return json({ key, deleted: true });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  }
};
