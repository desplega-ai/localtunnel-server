// Test script to verify the 502 fix
import http from 'http';

// Create a test request to the localtunnel server
// This simulates a request when the tunnel is connected but local server is down

const options = {
    hostname: '127.0.0.1',
    port: 3007,
    path: '/',
    method: 'GET',
    headers: {
        'Host': 'test.t.sh:3007'
    }
};

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response Body:', data);

        if (res.statusCode === 502) {
            console.log('✅ SUCCESS: Server correctly returns 502 when local server is unavailable');
        } else if (res.statusCode === 308) {
            console.log('❌ ISSUE: Still getting 308 redirect');
        } else if (res.statusCode === 503) {
            console.log('⚠️  No tunnel client connected (503 - Tunnel Unavailable)');
        }
    });
});

req.on('error', (err) => {
    console.error('Request error:', err.message);
});

req.end();