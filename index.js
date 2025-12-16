const ORIGIN_BASE =
  "http://kstv.us:8080/live/carloskiu/4461542986/";
const PLAYLIST = ORIGIN_BASE + "15965.m3u8";

const DVR_SECONDS = 300; // 5 minutes

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // =========================
    // SEGMENT PROXY
    // =========================
    if (url.pathname === "/seg") {
      const target = url.searchParams.get("u");
      if (!target) {
        return new Response("Missing segment URL", { status: 400 });
      }

      const segRes = await fetch(target, {
        cf: { cacheTtl: 0 },
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      return new Response(segRes.body, {
        status: segRes.status,
        headers: {
          "Content-Type": "video/mp2t",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // =========================
    // PLAYLIST HANDLER
    // =========================
    const res = await fetch(PLAYLIST, {
      cf: { cacheTtl: 0 },
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const text = await res.text();
    const lines = text.split("\n");

    let segments = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("#EXTINF")) {
        const duration = parseFloat(lines[i].split(":")[1]);
        let uri = lines[i + 1];

        if (!uri.startsWith("http")) {
          uri = ORIGIN_BASE + uri;
        }

        segments.push({
          duration,
          inf: lines[i],
          uri,
        });
      }
    }

    // Rolling 5-minute buffer
    let buffer = [];
    let total = 0;

    for (let i = segments.length - 1; i >= 0; i--) {
      buffer.unshift(segments[i]);
      total += segments[i].duration;
      if (total >= DVR_SECONDS) break;
    }

    const mediaSeq = Math.max(0, segments.length - buffer.length);

    let out = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-TARGETDURATION:10",
      "#EXT-X-PLAYLIST-TYPE:EVENT",
      "#EXT-X-MEDIA-SEQUENCE:" + mediaSeq,
    ];

    for (const s of buffer) {
      out.push(s.inf);
      out.push(
        url.origin + "/seg?u=" + encodeURIComponent(s.uri)
      );
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
