// index.js

/**
 * Cloudflare Worker HLS Proxy
 * Fetches the stream by dynamically mapping the request path to the target origin.
 * Designed to handle all HLS files (.m3u8 and .ts segments).
 */

export default {
  async fetch(request) {
    // --- Configuration ---
    const TARGET_ORIGIN = "https://mprod-cdn.toffeelive.com";
    
    // NOTE: Replace this with the most current Edge-Cache-Cookie value.
    // This value is the one that was confirmed working previously.
    const AUTH_COOKIE = "Edge-Cache-Cookie=URLPrefix=aHR0cHM6Ly9tcHJvZC1jZG4udG9mZmVlbGl2ZS5jb20:Expires=1765343156:KeyName=prod_live_events:Signature=KiDF2PUXpjdXgjOPuItWPR2lEXrCF52PIBFpohWBeBiNZsf-itP6XQrM1xRiisi8_gOsu4TJVQeCOcRJv1eDw";
    
    // Spoofed Headers (Essential for bypassing CDN checks)
    const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const REFERER_URL = "https://toffeelive.com/";
    // ---------------------

    const url = new URL(request.url);
    
    // Dynamically map the worker path (e.g., /live/match-asiacup-2/index.m3u8) 
    // to the target origin path.
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
      newHeaders.set("Accept", "*/*");
      newHeaders.set("Connection", "keep-alive");
      
      // Remove any potentially problematic security headers from the client request
      newHeaders.delete("X-Forwarded-For");

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: newHeaders,
        redirect: "follow",
      });

      // 3. Clone the response to modify headers for browser playback
      const newResponse = new Response(response.body, response);

      // Add CORS headers (essential)
      newResponse.headers.set("Access-Control-Allow-Origin", "*");
      newResponse.headers.set("Access-Control-Expose-Headers", "*");
      
      // Clean up security headers that might block embedding
      newResponse.headers.delete("X-Frame-Options");
      newResponse.headers.delete("Content-Security-Policy");
      
      // If the content is an m3u8 playlist, we may need to ensure 
      // the base URL is pointing back to the worker for segment resolution.
      if (response.headers.get("Content-Type")?.includes("application/vnd.apple.mpegurl")) {
          // If the playlist has absolute URLs, the browser will request them directly, 
          // bypassing the worker. This substitution ensures all future requests come back.
          const playlistContent = await response.text();
          const workerUrlBase = `https://${url.host}`; // e.g., https://my-worker.workers.dev
          
          // Replace all instances of the origin domain with the worker's domain
          const proxiedContent = playlistContent.replace(
              new RegExp(TARGET_ORIGIN.replace(/https?:\/\//, ''), 'g'), 
              url.host
          );
          
          return new Response(proxiedContent, newResponse);
      }

      return newResponse;

    } catch (e) {
      // Catch any network or DNS errors (like 1016)
      return new Response(`Proxy Error: Failed to fetch from origin. Error: ${e.message}`, { status: 500 });
    }
  },
};
