export default {
  async fetch(request) {
    const ORIGIN_PLAYLIST =
      "http://kstv.us:8080/live/carloskiu/4461542986/15965.m3u8";

    const DVR_WINDOW_SECONDS = 300; // 5 minutes

    const response = await fetch(ORIGIN_PLAYLIST, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    let playlist = await response.text();
    const lines = playlist.split("\n");

    let segments = [];
    let currentDuration = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("#EXTINF")) {
        const duration = parseFloat(lines[i].split(":")[1]);
        const uri = lines[i + 1];

        segments.push({
          duration,
          inf: lines[i],
          uri,
        });

        currentDuration += duration;
      }
    }

    // Keep only last 5 minutes
    let rolling = [];
    let rollingDuration = 0;

    for (let i = segments.length - 1; i >= 0; i--) {
      rolling.unshift(segments[i]);
      rollingDuration += segments[i].duration;

      if (rollingDuration >= DVR_WINDOW_SECONDS) break;
    }

    // Calculate media sequence
    const mediaSequence = segments.length - rolling.length;

    // Build new playlist
    let output = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-TARGETDURATION:10",
      "#EXT-X-MEDIA-SEQUENCE:" + mediaSequence,
    ];

    for (const seg of rolling) {
      output.push(seg.inf);
      output.push(seg.uri);
    }

    return new Response(output.join("\n"), {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};
