export default {
  async fetch(request, env, ctx) {
    // 1. Configuration
    const TARGET_ORIGIN = "https://mprod-cdn.toffeelive.com";
    
    // The specific cookie provided
    const AUTH_COOKIE = "Edge-Cache-Cookie=URLPrefix=aHR0cHM6Ly9tcHJvZC1jZG4udG9mZmVlbGl2ZS5jb20:Expires=1765343156:KeyName=prod_live_events:Signature=KiDF2PUXpjdXgjOPuItWPR2lEXrCF52PIBFqOohWBeBiNZsf-itP6XQrM1xRiisi8_gOsu4TJVQeCOcRJv1eDw";

    // 2. Handle CORS (Preflight requests)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // 3. Construct the upstream URL
    const url = new URL(request.url);
    // This takes the path (e.g., /live/match-asiacup-2/index.m3u8) and appends it to the target domain
    const targetUrl = `${TARGET_ORIGIN}${url.pathname}${url.search}`;

    // 4. Create the new request with the required headers
    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
    });

    // Inject the authentication cookie
    newRequest.headers.set("Cookie", AUTH_COOKIE);
    
    // Spoof the Referer and Origin to look like a legitimate request
    newRequest.headers.set("Referer", "https://toffeelive.com/");
    newRequest.headers.set("Origin", "https://toffeelive.com");
    newRequest.headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    try {
      // 5. Fetch from the origin
      const response = await fetch(newRequest);

      // 6. Reconstruct the response to send back to the browser
      // We must create a new Response object to modify headers (original is immutable)
      const newResponse = new Response(response.body, response);

      // Add CORS headers so the browser player can access the stream
      newResponse.headers.set("Access-Control-Allow-Origin", "*");
      newResponse.headers.set("Access-Control-Expose-Headers", "*");

      return newResponse;

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  },
};
