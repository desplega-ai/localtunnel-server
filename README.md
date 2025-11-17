# localtunnel-server

[![Build Status](https://travis-ci.org/localtunnel/server.svg?branch=master)](https://travis-ci.org/localtunnel/server)

localtunnel exposes your localhost to the world for easy testing and sharing! No need to mess with DNS or deploy just to have others test out your changes.

This repo is the server component. If you are just looking for the CLI localtunnel app, see (https://github.com/localtunnel/localtunnel).

## overview

The default localtunnel client connects to the `localtunnel.me` server. You can, however, easily set up and run your own server. In order to run your own localtunnel server you must ensure that your server can meet the following requirements:

-   You can set up DNS entries for your `domain.tld` and `*.domain.tld` (or `sub.domain.tld` and `*.sub.domain.tld`).
-   The server can accept incoming TCP connections for any non-root TCP port (i.e. ports over 1000).

The above are important as the client will ask the server for a subdomain under a particular domain. The server will listen on any OS-assigned TCP port for client connections.

#### setup

```shell
# pick a place where the files will live
git clone git://github.com/TheBoroer/localtunnel-server.git
cd localtunnel-server

# install dependencies using bun (or npm/yarn if preferred)
bun install

# server set to run on port 1234
bun run start --port 1234
```

**Note:** This project uses [Bun](https://bun.sh) as the primary package manager. You can also use `npm` or `yarn` if you prefer, as the project is compatible with all Node.js package managers. The `bun.lock` file should be committed to version control.

For detailed Bun setup instructions, see [BUN_SETUP.md](./BUN_SETUP.md).

The localtunnel server is now running and waiting for client requests on port 1234. You will most likely want to set up a reverse proxy to listen on port 80 (or start localtunnel on port 80 directly).

**NOTE** By default, localtunnel will use subdomains for clients, if you plan to host your localtunnel server itself on a subdomain you will need to use the _--domain_ option and specify the domain name behind which you are hosting localtunnel. (i.e. my-localtunnel-server.example.com)

#### use your server

You can now use your domain with the `--host` flag for the `lt` client.

```shell
lt --host http://sub.example.tld:1234 --port 9000
```

You will be assigned a URL similar to `heavy-puma-9.sub.example.com:1234`.

If your server is acting as a reverse proxy (i.e. nginx) and is able to listen on port 80, then you do not need the `:1234` part of the hostname for the `lt` client.

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
# Run all tests with bun
bun run test

# Or using npm
npm test

# Or directly with Mocha via bun
bun mocha --check-leaks '*.test.js' '**/*.test.js'
```

### Running in development mode

```bash
# Watch mode with bun
bun run dev

# Or using npm
npm run dev
```

### Available Scripts

- `bun run start` - Start the server
- `bun run dev` - Start server in development mode with file watching
- `bun test` - Run test suite

## Deploy

### Docker Deployment

The project includes an optimized Dockerfile using the latest **Bun runtime** and Node.js. This provides:

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
