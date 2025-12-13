export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: cors(),
      });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get("url");
    const referer = url.searchParams.get("referer") || "";

    if (!target) {
      return new Response("Missing ?url", { status: 400 });
    }

    const upstream = await fetch(target, {
      headers: {
        "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0",
        "Referer": referer,
        "Origin": referer ? new URL(referer).origin : "",
      },
    });

    const headers = new Headers(upstream.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Headers", "*");
    headers.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");

    // 🧠 If it's an m3u8 → rewrite it
    if (target.includes(".m3u8")) {
      let text = await upstream.text();

      const base = target.substring(0, target.lastIndexOf("/") + 1);

      text = text
        .split("\n")
        .map(line => {
          if (
            line.startsWith("#") ||
            line.trim() === ""
          ) return line;

          // absolute or relative segment URL
          const absolute = line.startsWith("http")
            ? line
            : base + line;

          return `${url.origin}/?url=${encodeURIComponent(
            absolute
          )}&referer=${encodeURIComponent(referer)}`;
        })
        .join("\n");

      headers.set("Content-Type", "application/vnd.apple.mpegurl");

      return new Response(text, {
        status: 200,
        headers,
      });
    }

    // 🎥 TS / media segments
    headers.set("Content-Type", "video/MP2T");

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  },
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  };
                }
