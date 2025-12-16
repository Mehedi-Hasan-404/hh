export default {
  async fetch(request) {
    // The specific stream URL you want to play
    const TARGET_URL = 'https://lor.us-east-1.amazonaws.com/v1/manifest/85b2e189604a6043ef957e7a3e6ed3bf9b11c843/USCA_DAI_STRM6/117c2abf-8f3d-498e-9531-dbd5aaa0a519/1.m3u8';

    // 1. Prepare the request to the Amazon server
    // We mask your identity by asking Cloudflare to fetch it.
    const modifiedRequest = new Request(TARGET_URL, {
      method: request.method,
      headers: {
        // Mimic a standard browser to avoid getting blocked
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.google.com/' 
      }
    });

    try {
      // 2. Fetch from Amazon (using Cloudflare's US IP)
      const response = await fetch(modifiedRequest);

      // 3. Create a new response to send back to you
      // We must recreate the response to modify headers (CORS)
      const newResponse = new Response(response.body, response);

      // 4. Add CORS headers so it plays in web players (like hls.js or Clappr)
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', '*');

      return newResponse;

    } catch (err) {
      // Handle any errors
      return new Response(`Stream Fetch Error: ${err.message}`, { status: 500 });
    }
  }
};
