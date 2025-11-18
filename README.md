# localtunnel-server

> **Note:** This is a fork of the original [localtunnel-server](https://github.com/localtunnel/server) with improvements and bug fixes.

localtunnel exposes your localhost to the world for easy testing and sharing! No need to mess with DNS or deploy just to have others test out your changes.

This repo is the server component. If you are just looking for the CLI localtunnel app, see (https://github.com/desplega-ai/localtunnel).

## What's New in This Fork

- ✅ **Fixed subdomain validation** - Now correctly accepts 4-5 character subdomains with hyphens (e.g., `my-s`, `a-b-c`)
- ✅ **Enhanced e2e tests** - Full authentication testing with proper Basic Auth header handling
- ✅ **CI/CD integration** - Automated e2e tests across multiple hosts with GitHub Actions
- ✅ **Better auth support** - Fixed fetch API credential handling in e2e tests

### Bug Fixes Details

#### Subdomain Validation Regex Fix

The original regex incorrectly rejected valid 4-5 character subdomains containing hyphens. The fix changes:

**Before (buggy):**
```regex
/^(?:[a-z0-9][a-z0-9\-]{4,63}[a-z0-9]|[a-z0-9]{4,63})$/
```
- Required 6-65 characters for subdomains with hyphens
- Rejected: `my-s`, `a-b-c`, etc.

**After (fixed):**
```regex
/^(?:[a-z0-9][a-z0-9\-]{2,61}[a-z0-9]|[a-z0-9]{4,63})$/
```
- Now correctly allows 4-63 characters for all subdomains
- Accepts: `my-s`, `a-b-c`, `test`, `my-subdomain`, etc.

#### E2E Authentication Fix

The `fetch()` API doesn't allow credentials embedded in URLs. The fix extracts credentials from URLs like `https://user:pass@domain.com` and converts them to proper Basic Auth headers, enabling proper authentication testing.

## overview

The default localtunnel client connects to the `lt.desplega.ai` server. You can, however, easily set up and run your own server. In order to run your own localtunnel server you must ensure that your server can meet the following requirements:

-   You can set up DNS entries for your `domain.tld` and `*.domain.tld` (or `sub.domain.tld` and `*.sub.domain.tld`).
-   The server can accept incoming TCP connections for any non-root TCP port (i.e. ports over 1000).

The above are important as the client will ask the server for a subdomain under a particular domain. The server will listen on any OS-assigned TCP port for client connections.

#### setup

```shell
git clone https://github.com/desplega-ai/localtunnel-server.git
cd localtunnel-server
npm install
npm run start -- --port 3007 --host localhost:3007
```

The localtunnel server is now running and waiting for client requests on port 1234. You will most likely want to set up a reverse proxy to listen on port 80 (or start localtunnel on port 80 directly).

**NOTE** By default, localtunnel will use subdomains for clients, if you plan to host your localtunnel server itself on a subdomain you will need to use the _--domain_ option and specify the domain name behind which you are hosting localtunnel. (i.e. my-localtunnel-server.example.com)

#### use your server

You can now use your domain with the `--host` flag for the `@desplega.ai/localtunnel` client:

```shell
npx @desplega.ai/localtunnel --host http://sub.example.tld:1234 --port 9000
```

You will be assigned a URL similar to `heavy-puma-9.sub.example.com:1234`.

If your server is acting as a reverse proxy (i.e. nginx) and is able to listen on port 80, then you do not need the `:1234` part of the hostname for the `@desplega.ai/localtunnel` client.

## Authentication (Optional)

Tunnels can be optionally protected with HTTP Basic Authentication. When creating a tunnel, you can specify authentication credentials that will be required to access the tunnel endpoint.

### Creating an authenticated tunnel

```bash
# Auto-generate a secure password
curl "http://localhost:3000/?new&username=admin"
# Response: { "id": "abc123", "username": "admin", "password": "a1b2c3d4e5f6g7h8", "url": "https://admin:a1b2c3d4e5f6g7h8@abc123.example.com", ... }

# Use a custom password
curl "http://localhost:3000/?new&username=myuser&password=mypassword"
# Response: { "id": "xyz789", "username": "myuser", "password": "mypassword", "url": "https://myuser:mypassword@xyz789.example.com", ... }

# Create without authentication (default)
curl "http://localhost:3000/?new"
# Response: { "id": "def456", "url": "https://def456.example.com", ... }
```

### Accessing an authenticated tunnel

Authenticated tunnels can be accessed using standard HTTP Basic Authentication:

```bash
# Using curl with credentials
curl -u admin:password https://abc123.example.com

# Using Authorization header
curl -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" https://abc123.example.com

# In browser or via URL (if using user:pass@host format)
https://admin:password@abc123.example.com
```

### Features

- **Optional** - Authentication is completely optional; existing tunnels without credentials work as before
- **Auto-generated passwords** - If you specify a username without a password, a secure random password is automatically generated
- **Browser support** - Standard HTTP Basic Auth prompts in browsers
- **WebSocket support** - Authentication works for both HTTP and WebSocket connections
- **Timing-safe validation** - Uses constant-time comparison to prevent timing attacks

## REST API

### POST /api/tunnels

Create a new tunnel. A LocalTunnel client posts to this enpoint to request a new tunnel with a specific name or a randomly assigned name.

#### Query Parameters

- `username` (optional) - Username for tunnel authentication
- `password` (optional) - Password for tunnel authentication. If username is provided without password, a random password is auto-generated.

### GET /api/status

General server information.

## Development

### Running tests

This project uses **Mocha** for testing.

```bash
# Run all tests
npm run test
```

### Running in development mode

```bash
# Watch mode with npm
npm run dev -- --port 3007 --host localhost:3007
```

### Available Scripts

- `npm run start` - Start the server
- `npm run dev` - Start server in development mode with file watching
- `npm test` - Run test suite

### End-to-End Testing

This project includes comprehensive e2e tests that verify the server works correctly with real tunnel connections.

```bash
# Run e2e tests against a server (without authentication)
node e2e.js --host=https://lt.desplega.ai --subdomain=test

# Run e2e tests with authentication enabled
node e2e.js --host=https://lt.desplega.ai --subdomain=test --auth
```

The e2e tests verify:
- HTTP endpoint connectivity
- WebSocket endpoint connectivity
- Authentication protection (401 for unauthorized requests when auth is enabled)

#### CI/CD

The project uses GitHub Actions to automatically run e2e tests on every push and pull request. Tests run in a matrix across:
- Multiple hosts: `lt.desplega.ai` and `lt.us.desplega.ai`
- With and without authentication

**Important:** Tests for the same host run sequentially (not in parallel) to avoid subdomain conflicts, since all tests use the subdomain `test`. However, tests for different hosts can run in parallel.

See `.github/workflows/e2e.yml` for the full configuration.

## Deploy

### Docker Deployment

The project includes an optimized Dockerfile using the latest **npm runtime** and Node.js. This provides:

- ✅ Smaller image size (~500MB vs ~700MB for Node)
- ✅ Faster startup times
- ✅ Better performance
- ✅ Modern JavaScript runtime

**Quick Start:**

```bash
# Build the image
docker build -t localtunnel-server:latest .

# Run the container
docker run -d \
    --restart always \
    --name localtunnel \
    -p 3000:3000 \
    localtunnel-server:latest

# With custom domain
docker run -d \
    --restart always \
    --name localtunnel \
    -p 3000:3000 \
    localtunnel-server:latest \
    --port 3000 --domain example.com
```

**Note:** Set up a reverse proxy (like Nginx) in front of the container to handle HTTPS and route to port 3000.

For detailed Docker setup, including Docker Compose, Kubernetes, and production configurations, see [DOCKER.md](./DOCKER.md).
