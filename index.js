const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// --- Your Configuration ---
const PROXY_IP = '142.111.48.253';
const PROXY_PORT = '7030';
const PROXY_USERNAME = 'iuookxfv';
const PROXY_PASSWORD = '34bkqfesh5hp';
const STREAM_URL = 'https://lor.us-east-1.amazonaws.com/v1/manifest/85b2e189604a6043ef957e7a3e6ed3bf9b11c843/USCA_DAI_STRM6/117c2abf-8f3d-498e-9531-dbd5aaa0a519/1.m3u8';
// --------------------------

// 1. Construct the Proxy URL
const proxyUrl = `http://${PROXY_USERNAME}:${PROXY_PASSWORD}@${PROXY_IP}:${PROXY_PORT}`;

// 2. Create the Proxy Agent
// This agent tells axios to route the request through your proxy
const agent = new HttpsProxyAgent(proxyUrl);

/**
 * Fetches the streaming manifest using the authenticated proxy.
 */
async function fetchStreamManifest() {
    console.log(`Attempting to fetch manifest via proxy: ${PROXY_IP}:${PROXY_PORT}`);
    
    try {
        const response = await axios.get(STREAM_URL, {
            // Use the proxy agent for this request
            httpsAgent: agent,
            // Set a User-Agent to mimic a browser, which can help with some servers
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            // Set a timeout in case the proxy or target server is slow
            timeout: 15000 
        });

        console.log('--- Successfully Fetched Manifest ---');
        console.log(`Status Code: ${response.status}`);
        
        // Output the content of the M3U8 file
        console.log('\nManifest Content:\n');
        console.log(response.data);
        console.log('\n-------------------------------------');

    } catch (error) {
        // Handle errors (e.g., proxy authentication failure, network error, stream not found)
        console.error('--- ERROR FETCHING STREAM ---');
        if (error.response) {
            // The server responded with a status code outside the 2xx range
            console.error(`Status: ${error.response.status}`);
            console.error(`Data: ${error.response.data.substring(0, 200)}...`);
        } else if (error.request) {
            // The request was made but no response was received (e.g., proxy/network failure)
            console.error('No response received from proxy or target server.');
        } else {
            // Something else went wrong
            console.error('Axios Error:', error.message);
        }
    }
}

fetchStreamManifest();
