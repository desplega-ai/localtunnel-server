# Use Node.js 20 (latest LTS)
FROM node:20-slim

# Install additional dependencies
RUN apt-get update && apt-get install -y \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies in production mode
RUN npm ci --production

# Copy application code
COPY . /app

# Set environment to production
ENV NODE_ENV production

# Expose default port
EXPOSE 3000

# Run the server
ENTRYPOINT ["node", "./bin/server.js"]
