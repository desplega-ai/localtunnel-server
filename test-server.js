#!/usr/bin/env node

// Simple test server to debug what headers are being received
const http = require('http');

const server = http.createServer((req, res) => {
    console.log('\n=== Incoming Request ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('\n--- ALL HEADERS ---');
    console.log(JSON.stringify(req.headers, null, 2));
    console.log('\n--- KEY HEADERS ---');
    console.log('X-Forwarded-Proto:', req.headers['x-forwarded-proto']);
    console.log('X-Forwarded-Host:', req.headers['x-forwarded-host']);
    console.log('Host:', req.headers['host']);
    console.log('=======================\n');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        message: 'Headers received successfully - NO 308 redirect!',
        headers: req.headers,
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        'x-forwarded-host': req.headers['x-forwarded-host'],
    }, null, 2));
});

server.listen(6969, () => {
    console.log('🚀 Test server listening on http://localhost:6969');
    console.log('📝 This server will dump all incoming headers for debugging\n');
});
