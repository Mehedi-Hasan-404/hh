// index.js

export default {
  async fetch(request, env) {
    // --- Configuration ---
    const TARGET_ORIGIN = "https://mprod-cdn.toffeelive.com";
    
    // **CRITICAL CHANGE:** Read the cookie from the Worker's environment variables
    const AUTH_COOKIE = env.AUTH_COOKIE;
    
    if (!AUTH_COOKIE) {
      return new Response("Error: AUTH_COOKIE environment variable is missing or empty.", { status: 500 });
    }
    
    // Spoofed Headers (Essential for bypassing CDN checks)
    const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const REFERER_URL = "https://toffeelive.com/";
    // ---------------------

    const url = new URL(request.url);
    const targetUrl = `${TARGET_ORIGIN}${url.pathname}${url.search}`;

    // 1. Handle CORS Preflight Requests (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {
      // 2. Create the Upstream Request with spoofed headers
      const newHeaders = new Headers(request.headers);
      
      // Override browser headers with required spoofed values
      newHeaders.set("Cookie", AUTH_COOKIE);
      newHeaders.set("User-Agent", USER_AGENT);
      newHeaders.set("Referer", REFERER_URL);
      newHeaders.set("Origin", "https://toffeelive.com");
      // ... other headers remain the same ...

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: newHeaders,
        redirect: "follow",
      });

      // 3. Clone and modify response for HLS playback (including m3u8 rewrite)
      const newResponse = new Response(response.body, response);
      newResponse.headers.set("Access-Control-Allow-Origin", "*");
      newResponse.headers.set("Access-Control-Expose-Headers", "*");
      newResponse.headers.delete("X-Frame-Options");
      newResponse.headers.delete("Content-Security-Policy");

      // Logic to rewrite absolute URLs in m3u8 playlists back to the worker
      if (response.headers.get("Content-Type")?.includes("application/vnd.apple.mpegurl")) {
          const playlistContent = await response.text();
          const proxiedContent = playlistContent.replace(
              new RegExp(TARGET_ORIGIN.replace(/https?:\/\//, ''), 'g'), 
              url.host
          );
          return new Response(proxiedContent, newResponse);
      }

      return newResponse;

    } catch (e) {
      return new Response(`Proxy Error: Failed to fetch from origin. Error: ${e.message}`, { status: 500 });
    }
  },
};
