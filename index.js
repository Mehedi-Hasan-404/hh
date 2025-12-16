const ORIGIN_BASE =
  "http://kstv.us:8080/live/carloskiu/4461542986/";
const ORIGIN_PLAYLIST = ORIGIN_BASE + "15965.m3u8";

const DVR_WINDOW = 300; // 5 minutes

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // -------------------------------
    // SEGMENT PROXY
    // -------------------------------
    if (url.pathname.startsWith("/seg")) {
      const target = url.searchParams.get("u");
      if (!target) {
        return new Response("Missing segment URL", { status: 400 });
      }

      return fetch(target, {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });
    }

    // -------------------------------
    // PLAYLIST HANDLER
    // -------------------------------
    const res = await fetch(ORIGIN_PLAYLIST, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const text = await res.text();
    const lines = text.split("\n");

    let segments = [];
    let total = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("#EXTINF")) {
        const duration = parseFloat(lines[i].split(":")[1]);
        let uri = lines[i + 1];

        // Make absolute
        if (!uri.startsWith("http")) {
          uri = ORIGIN_BASE + uri;
        }

        segments.push({ duration, inf: lines[i], uri });
        total += duration;
      }
    }

    // Keep last 5 minutes
    let buffer = [];
    let sum = 0;

    for (let i = segments.length - 1; i >= 0; i--) {
      buffer.unshift(segments[i]);
      sum += segments[i].duration;
      if (sum >= DVR_WINDOW) break;
    }

    const mediaSeq = segments.length - buffer.length;

    let out = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-TARGETDURATION:10",
      "#EXT-X-MEDIA-SEQUENCE:" + mediaSeq,
    ];

    for (const s of buffer) {
      const proxied =
        url.origin + "/seg?u=" + encodeURIComponent(s.uri);
      out.push(s.inf);
      out.push(proxied);
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
