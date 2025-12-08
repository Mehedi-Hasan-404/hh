export default {
  async fetch(request) {
    const url = new URL(request.url);

    // HLS playlist
    if (url.pathname === "/stream.m3u8") {
      const m3u8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10,
segment.ts
#EXT-X-ENDLIST
`;

      return new Response(m3u8, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store",
        },
      });
    }

    // TS proxy
    if (url.pathname === "/segment.ts") {
      const upstream = "https://zamlb.tgaadi.workers.dev/96988.ts";
      const resp = await fetch(upstream);

      return new Response(resp.body, {
        status: resp.status,
        headers: {
          "Content-Type": "video/mp2t",
          "Cache-Control": "no-store",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
