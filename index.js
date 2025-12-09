export default {
  async fetch(request, env, ctx) {
    const TARGET_ORIGIN = "https://mprod-cdn.toffeelive.com";
    
    // The specific cookie value you provided
    const COOKIE_VALUE = "Edge-Cache-Cookie=URLPrefix=aHR0cHM6Ly9tcHJvZC1jZG4udG9mZmVlbGl2ZS5jb20:Expires=1765343156:KeyName=prod_live_events:Signature=KiDF2PUXpjdXgjOPuItWPR2lEXrCF52PIBFqOohWBeBiNZsf-itP6XQrM1xRiisi8_gOsu4TJVQeCOcRJv1eDw";

    // Handle CORS (so it plays on GitHub Pages or Localhost)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const url = new URL(request.url);
    const targetUrl = `${TARGET_ORIGIN}${url.pathname}${url.search}`;

    // Create headers that mimic a real browser visiting ToffeeLive
    const newHeaders = new Headers();
    
    // CRITICAL: The Cookie must be set exactly like this
    newHeaders.set("Cookie", COOKIE_VALUE);
    
    // CRITICAL: Spoof the User-Agent (Toffee blocks generic worker agents)
    newHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    
    // CRITICAL: Spoof the Referer
    newHeaders.set("Referer", "https://toffeelive.com/");
    newHeaders.set("Origin", "https://toffeelive.com");
    newHeaders.set("Accept", "*/*");
    newHeaders.set("Connection", "keep-alive");

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: newHeaders,
        redirect: "follow"
      });

      // Clone the response to modify headers
      const newResponse = new Response(response.body, response);

      // Add CORS headers to the RESPONSE so your browser accepts it
      newResponse.headers.set("Access-Control-Allow-Origin", "*");
      newResponse.headers.set("Access-Control-Expose-Headers", "*");
      
      // Remove security headers that might block embedding
      newResponse.headers.delete("X-Frame-Options");
      newResponse.headers.delete("Content-Security-Policy");

      return newResponse;

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  },
};
