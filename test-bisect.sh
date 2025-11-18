#!/bin/bash
# Git bisect test script for localtunnel tunnel timeout issue
# This script tests if tunnel connections stay alive for at least 20 seconds

set -e

echo "=== Testing commit $(git rev-parse --short HEAD) ==="

# Kill any existing servers on port 3007
lsof -ti:3007 | xargs kill -9 2>/dev/null || true
sleep 1

# Install dependencies if needed
echo "Installing dependencies..."
npm install -D localtunnel @desplega.ai/localtunnel >/dev/null 2>&1

# Start the server in background
echo "Starting server..."
export DEBUG="*"
npm run start -- --port 3007 --domain t.sh:3007 > /tmp/bisect-server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Check if server started successfully
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "FAIL: Server failed to start"
    exit 1
fi

# Run the e2e test with a timeout
echo "Running E2E test..."
if node e2e.js --host=http://t.sh:3007 2>&1 | tee /tmp/bisect-test.log; then
    echo "PASS: Test succeeded"
    kill $SERVER_PID 2>/dev/null || true
    exit 0
else
    echo "FAIL: Test failed"
    # Show last 30 lines of server log for debugging
    echo "=== Server log (last 30 lines) ==="
    tail -30 /tmp/bisect-server.log
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi
