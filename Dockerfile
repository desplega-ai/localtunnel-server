# Use the latest Bun image (includes Node.js)
FROM oven/bun:latest

# Install additional dependencies
RUN apt-get update && apt-get install -y \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies in production mode
RUN bun install --production

# Copy application code
COPY . /app

# Set environment to production
ENV NODE_ENV production

# Expose default port
EXPOSE 3000

# Run the server
ENTRYPOINT ["bun", "run", "start"]
