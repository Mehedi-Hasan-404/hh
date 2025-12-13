addEventListener("fetch", event => {
  event.respondWith(handle(event.request));
});

async function handle(request) {
  const url = new URL(request.url);

  // Target upstream HLS URL we want to proxy
  // You can pass id & referer as query params
  const upstream = url.searchParams.get("url");
  if (!upstream) {
    return new Response("Missing ?url=...", { status: 400 });
  }

  // Fetch upstream
  const init = {
    method: request.method,
    headers: {
      // send referer if provided
      referer: url.searchParams.get("referer") || "",
      "user-agent": request.headers.get("user-agent"),
    },
  };

  const res = await fetch(upstream, init);

  // Clone response so we can modify headers
  const headers = new Headers(res.headers);

  // Always allow CORS
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "*");

  // Fix content types
  if (upstream.endsWith(".m3u8")) {
    headers.set("Content-Type", "application/vnd.apple.mpegurl");
  }

  if (upstream.match(/\.(ts|aac|mp4)$/)) {
    headers.set("Content-Type", "video/MP2T");
  }

  return new Response(res.body, {
    status: res.status,
    headers,
  });
}
