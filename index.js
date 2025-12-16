const ENTRY_PLAYLIST =
  "https://lor.us-east-1.amazonaws.com/v1/manifest/85b2e189604a6043ef957e7a3e6ed3bf9b11c843/USCA_DAI_STRM6/117c2abf-8f3d-498e-9531-dbd5aaa0a519/1.m3u8";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // ============================
    // SEGMENT / KEY / SUBPLAYLIST PROXY
    // ============================
    if (url.pathname === "/p") {
      const target = url.searchParams.get("u");
      if (!target) {
        return new Response("Missing target", { status: 400 });
      }

      const res = await fetch(target, {
        redirect: "follow",
        cf: {
          cacheTtl: 0,
          // Force US edge
          colocation: "us",
        },
      });

      const headers = new Headers(res.headers);
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Cache-Control", "no-store");

      return new Response(res.body, {
        status: res.status,
        headers,
      });
    }

    // ============================
    // PLAYLIST HANDLER
    // ============================
    const res = await fetch(ENTRY_PLAYLIST, {
      redirect: "follow",
      cf: {
        cacheTtl: 0,
        colocation: "us",
      },
    });

    const finalURL = res.url;
    const baseURL =
      finalURL.substring(0, finalURL.lastIndexOf("/") + 1);

    const text = await res.text();
    const lines = text.split("\n");

    let out = [];

    for (const line of lines) {
      if (
        line.startsWith("#") ||
        line.trim() === ""
      ) {
        out.push(line);
      } else {
        // Resolve relative URLs
        const abs = line.startsWith("http")
          ? line
          : baseURL + line;

        out.push(
          `${url.origin}/p?u=${encodeURIComponent(abs)}`
        );
      }
    }

    return new Response(out.join("\n"), {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};
