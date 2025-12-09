export default {
  async fetch(request, env, ctx) {
    // Configuration
    const STREAM_URL = "https://mprod-cdn.toffeelive.com/live/match-asiacup-2/index.m3u8";
    const REFERER_URL = "https://toffeelive.com/";
    const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    // 1. Handle CORS (for playing in browser/Github Pages)
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
      // 2. Step 1: "Log in" / Get the Cookie
      // We make a HEAD request to the main site or a known video page to trigger the Set-Cookie header
      const authResponse = await fetch("https://toffeelive.com/", {
        method: "HEAD", // HEAD is faster, we only need headers
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": "https://google.com" // Look like a Google search visitor
        }
      });

      // Extract the cookie string from the "Set-Cookie" header
      let cookie = authResponse.headers.get("set-cookie");
      
      // Fallback: If the main page doesn't set it, sometimes we must hit a specific API or use a hardcoded fallback
      // Note: If Toffee requires an OTP login, this auto-fetch will fail and you MUST use a hardcoded cookie.
      if (!cookie) {
        // Option: Insert a backup cookie here if you have one, or throw error
        // cookie = "Edge-Cache-Cookie=..." 
        throw new Error("Could not auto-generate cookie from ToffeeLive.");
      }

      // 3. Step 2: Fetch the Stream using the new Cookie
      // Construct the URL. If the user requests a .ts segment, we pass that through.
      const url = new URL(request.url);
      
      // If the request is for the main m3u8, use the hardcoded stream URL
      // If the request is for a segment (path doesn't end in /), append the path to the origin
      let targetUrl = STREAM_URL;
      
      // Logic to handle segments (ts files) if the player requests them relative to your worker
      if (url.pathname !== "/" && url.pathname.includes(".ts")) {
         targetUrl = `https://mprod-cdn.toffeelive.com${url.pathname}`;
      }

      const streamHeaders = new Headers();
      streamHeaders.set("Cookie", cookie); // The fresh cookie we just got
      streamHeaders.set("User-Agent", USER_AGENT);
      streamHeaders.set("Referer", REFERER_URL);
      streamHeaders.set("Origin", "https://toffeelive.com");

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: streamHeaders
      });

      // 4. Return the video to the user
      const newResponse = new Response(response.body, response);
      newResponse.headers.set("Access-Control-Allow-Origin", "*");
      newResponse.headers.set("Access-Control-Expose-Headers", "*");

      return newResponse;

    } catch (e) {
      return new Response(`Proxy Error: ${e.message}`, { status: 500 });
    }
  },
};
