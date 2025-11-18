import { createServer } from 'http';
import localtunnel from '@desplega.ai/localtunnel';
// import localtunnel from 'localtunnel';
import ws from 'ws';
const WebSocket = ws.WebSocket || ws;
const WebSocketServer = ws.WebSocketServer || ws.Server;

const PORT = 9876;
const DEFAULT_HOST = 'https://lt.desplega.ai';

// Parse command line arguments
const args = process.argv.slice(2);
const hostArg = args.find(arg => arg.startsWith('--host='));

const host = hostArg ? hostArg.split('=')[1] : DEFAULT_HOST;

const subdomainArg = args.find(arg => arg.startsWith('--subdomain='));
const subdomain = subdomainArg ? subdomainArg.split('=')[1] : 'test';

console.log(`🚀 Starting E2E test against: ${host} (subdomain: ${subdomain})`);
console.log(`📡 Local server port: ${PORT}\n`);

// Create test server
const server = createServer((req, res) => {
  if (req.url === '/http') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Hello from HTTP endpoint!',
      timestamp: new Date().toISOString(),
      success: true
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('  ✓ WebSocket client connected to local server');

  let pingCount = 0;
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      pingCount++;
      ws.send(JSON.stringify({
        type: 'ping',
        count: pingCount,
        timestamp: new Date().toISOString()
      }));
    }
  }, 1000);

  ws.on('close', () => {
    clearInterval(interval);
    console.log('  ✓ WebSocket client disconnected from local server');
  });

  ws.on('error', (err) => {
    console.error('  ✗ WebSocket error on local server:', err.message);
    clearInterval(interval);
  });
});

// Start server
server.listen(PORT, async () => {
  console.log(`✓ Local test server running on http://localhost:${PORT}`);
  console.log(`  - HTTP endpoint: http://localhost:${PORT}/http`);
  console.log(`  - WebSocket endpoint: ws://localhost:${PORT}/ws\n`);

  // Wait for 1 minute and return
  // await new Promise(resolve => setTimeout(resolve, 60_000));
  // return

  try {
    // Create tunnel
    console.log('🔌 Creating localtunnel...');
    const tunnel = await localtunnel({
      port: PORT,
      host: host,
      subdomain,
    });

    console.log(`✓ Tunnel created: ${tunnel.url}\n`);

    // Test HTTP endpoint
    console.log('📝 Testing HTTP endpoint...');
    try {
      const httpUrl = `${tunnel.url}/http`;
      console.log(`  GET ${httpUrl}`);

      const httpResponse = await fetch(httpUrl);
      const httpData = await httpResponse.json();

      console.log(`  ✓ Status: ${httpResponse.status}`);
      console.log(`  ✓ Response:`, httpData);

      if (httpData.success) {
        console.log('  ✅ HTTP test PASSED\n');
      } else {
        throw new Error('HTTP response did not contain success: true');
      }
    } catch (error) {
      console.error('  ❌ HTTP test FAILED:', error.message);
      throw error;
    }

    // Test WebSocket endpoint
    console.log('📝 Testing WebSocket endpoint...');
    await new Promise((resolve, reject) => {
      const wsUrl = tunnel.url.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';
      console.log(`  CONNECT ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      let receivedMessages = 0;
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket test timeout - no messages received after 10 seconds'));
      }, 10000);

      ws.on('open', () => {
        console.log('  ✓ WebSocket connected');
      });

      ws.on('message', (data) => {
        receivedMessages++;
        const message = JSON.parse(data.toString());
        console.log(`  ✓ Received message #${receivedMessages}:`, message);

        // After receiving 3 pings, consider test successful
        if (receivedMessages >= 3) {
          clearTimeout(timeout);
          ws.close();
          console.log('  ✅ WebSocket test PASSED\n');
          resolve();
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.error('  ✗ WebSocket error:', error.message);
        reject(error);
      });

      ws.on('close', () => {
        clearTimeout(timeout);
        if (receivedMessages < 3) {
          reject(new Error(`WebSocket closed before receiving enough messages (got ${receivedMessages}, expected 3)`));
        }
      });
    });

    // All tests passed
    console.log('🎉 All tests PASSED!\n');

    // Cleanup
    tunnel.close();
    server.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    server.close();
    process.exit(1);
  }
});

// Handle errors
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  server.close();
  process.exit(0);
});
