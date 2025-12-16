export default {
  async fetch(request, env, ctx) {
    // --- Configuration ---
    // The destination stream URL
    const DESTINATION_URL = 'https://lor.us-east-1.amazonaws.com/v1/manifest/85b2e189604a6043ef957e7a3e6ed3bf9b11c843/USCA_DAI_STRM6/117c2abf-8f3d-498e-9531-dbd5aaa0a519/1.m3u8';
    
    // Proxy Details
    const PROXY_IP = '142.111.48.253';
    const PROXY_PORT = '7030';
    const PROXY_USER = 'iuookxfv';
    const PROXY_PASS = '34bkqfesh5hp';
    // ---------------------

    // Cloudflare Workers cannot natively tunnel through a standard HTTP proxy 
    // using 'fetch' alone if the proxy requires a CONNECT method (SOCKS/HTTPS).
    //
    // However, if your proxy provider allows HTTP-based forwarding (GET http://target...), 
    // we can construct the request manually.
    
    // 1. Construct the Proxy URL
    // We request the PROXY to fetch the TARGET.
    const proxyUrl = `http://${PROXY_IP}:${PROXY_PORT}/${DESTINATION_URL}`;
    
    // 2. Create Auth Header for the Proxy
    // Basic Auth format: "Basic base64(user:pass)"
    const authString = btoa(`${PROXY_USER}:${PROXY_PASS}`);

    try {
      // 3. Make the fetch request to the Proxy
      // Note: This assumes the proxy accepts "GET /target_url" style requests
      // rather than requiring the CONNECT method.
      const response = await fetch(DESTINATION_URL, {
        method: 'GET',
        headers: {
            // Some proxies require the auth in the 'Proxy-Authorization' header
            'Proxy-Authorization': `Basic ${authString}`,
            // Others might just want standard 'Authorization' depending on setup
            // 'Authorization': `Basic ${authString}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        // IMPORTANT: Cloudflare Workers specific proxy option (Enterprise only mostly)
        // or using a library like 'https-proxy-agent' is NOT possible here.
        // We are attempting a direct fetch assuming the Worker's own IP is acceptable
        // OR trying to relay.
      });

      // If you are on a specific Cloudflare plan that supports egress proxies, 
      // the setup is different. 
      
      // Standard fetch (without proxy relay) - This uses Cloudflare's IP.
      // If the stream is just geo-blocked to the US, Cloudflare's US workers might
      // work WITHOUT your custom proxy.
      
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      return newResponse;

    } catch (e) {
      return new Response(`Error: ${e.message}`, { status: 500 });
    }
  },
};
