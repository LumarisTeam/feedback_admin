import http from "node:http";

const port = Number(process.env.FAKE_COS_PORT ?? 9000);
const allowedOrigins = new Set(
  (process.env.FAKE_COS_ALLOWED_ORIGINS ??
    "http://127.0.0.1:5173,http://127.0.0.1:8081")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const objects = new Map();

function corsHeaders(request) {
  const origin = request.headers.origin;
  return {
    ...(origin && allowedOrigins.has(origin)
      ? { "Access-Control-Allow-Origin": origin }
      : {}),
    "Access-Control-Allow-Methods": "GET, HEAD, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, ETag",
    Vary: "Origin",
  };
}

function sendEmpty(response, status) {
  response.writeHead(status, corsHeaders(response.req));
  response.end();
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (request.method === "OPTIONS") {
    sendEmpty(response, 204);
    return;
  }

  if (request.method === "GET" && url.pathname === "/healthz") {
    response.writeHead(200, {
      ...corsHeaders(request),
      "Content-Type": "application/json",
    });
    response.end(JSON.stringify({ ok: true, objects: objects.size }));
    return;
  }

  const key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));

  if (request.method === "PUT") {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    objects.set(key, {
      body,
      contentType: request.headers["content-type"] ?? "application/octet-stream",
    });
    response.writeHead(200, {
      ...corsHeaders(request),
      ETag: `"fake-${body.length}"`,
    });
    response.end();
    return;
  }

  const object = objects.get(key);
  if (request.method === "HEAD") {
    if (!object) {
      sendEmpty(response, 404);
      return;
    }
    response.writeHead(200, {
      ...corsHeaders(request),
      "Content-Length": String(object.body.length),
      "Content-Type": object.contentType,
      ETag: `"fake-${object.body.length}"`,
    });
    response.end();
    return;
  }

  if (request.method === "GET") {
    if (!object) {
      sendEmpty(response, 404);
      return;
    }
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d+)$/);
    if (!range) {
      response.writeHead(200, {
        ...corsHeaders(request),
        "Content-Length": String(object.body.length),
        "Content-Type": object.contentType,
      });
      response.end(object.body);
      return;
    }
    const start = Number(range[1]);
    const end = Math.min(Number(range[2]), object.body.length - 1);
    const body = object.body.subarray(start, end + 1);
    response.writeHead(206, {
      ...corsHeaders(request),
      "Content-Length": String(body.length),
      "Content-Range": `bytes ${start}-${end}/${object.body.length}`,
      "Content-Type": object.contentType,
    });
    response.end(body);
    return;
  }

  if (request.method === "DELETE") {
    objects.delete(key);
    sendEmpty(response, 204);
    return;
  }

  sendEmpty(response, 405);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`fake COS listening on http://127.0.0.1:${port}`);
});
