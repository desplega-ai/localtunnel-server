# Docker Setup for Localtunnel Server

This guide explains how to build and run the Localtunnel Server using Docker with Bun.

## Quick Start

### Build the Docker Image

```bash
docker build -t localtunnel-server:latest .
```

### Run the Container

```bash
# Basic usage (port 3000)
docker run -d \
  --name localtunnel \
  -p 3000:3000 \
  localtunnel-server:latest

# With custom domain
docker run -d \
  --name localtunnel \
  -p 3000:3000 \
  localtunnel-server:latest \
  --port 3000 --domain example.com

# With environment variables
docker run -d \
  --name localtunnel \
  -p 3000:3000 \
  -e NODE_ENV=production \
  localtunnel-server:latest
```

## Dockerfile Details

The Dockerfile uses:

- **Base Image**: `oven/bun:latest` - Official Bun image with Node.js included
- **Package Manager**: Bun for dependency management
- **Production Optimized**: Only installs production dependencies
- **Minimal Size**: Bun images are typically smaller than Node images

### Why Bun?

1. **Performance** - Faster startup and execution times
2. **Efficiency** - Smaller image size than traditional Node.js
3. **Modern** - Latest JavaScript runtime with better compatibility
4. **Native ESM** - No additional configuration needed
5. **Consistency** - Same package manager as local development

## Docker Compose

For easier management, create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  localtunnel:
    build: .
    container_name: localtunnel-server
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
    restart: unless-stopped
    # Optional: add domain
    # command: --port 3000 --domain example.com
```

Then run with:

```bash
docker-compose up -d
```

## Production Deployment

### Using Reverse Proxy (Nginx)

The Dockerfile exposes port 3000. Set up a reverse proxy in front:

```nginx
server {
    listen 80;
    server_name *.example.com example.com;

    location / {
        proxy_pass http://localtunnel:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Multi-Stage Build (Optional)

For even smaller images, use multi-stage build:

```dockerfile
FROM oven/bun:latest AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production

FROM oven/bun:slim
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV production
EXPOSE 3000
ENTRYPOINT ["bun", "run", "start"]
```

## Kubernetes Deployment

Example Kubernetes manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: localtunnel-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: localtunnel-server
  template:
    metadata:
      labels:
        app: localtunnel-server
    spec:
      containers:
      - name: localtunnel
        image: localtunnel-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: localtunnel-service
spec:
  selector:
    app: localtunnel-server
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Environment Variables

Available environment variables:

- `NODE_ENV` - Set to `production` for deployment
- Custom server options via command line arguments (see `bin/server.js`)

## Troubleshooting

### Image Build Fails

```bash
# Clear Docker cache and rebuild
docker build --no-cache -t localtunnel-server:latest .
```

### Port Already in Use

```bash
# Use a different host port
docker run -p 8080:3000 localtunnel-server:latest
```

### Container Exits Immediately

```bash
# Check logs
docker logs localtunnel
```

## Image Size

Bun images are significantly smaller than Node.js alternatives:

- **oven/bun:latest** ~500MB compressed
- Compared to Node 22-alpine: ~700MB compressed

## Version Management

To use a specific Bun version:

```dockerfile
FROM oven/bun:1.0.0  # Specify version instead of latest
```

Check available versions: https://hub.docker.com/r/oven/bun/tags

## Security Considerations

1. **Always use specific versions in production**, not `latest`
2. **Run as non-root user** (add to Dockerfile if needed)
3. **Use environment variables** for sensitive configuration
4. **Limit container resources** with memory/CPU limits
5. **Keep base images updated** regularly

## Resources

- [Bun Docker Documentation](https://bun.sh/docs/installation/docker)
- [Docker Official Reference](https://docs.docker.com/)
- [Docker Compose Guide](https://docs.docker.com/compose/)
