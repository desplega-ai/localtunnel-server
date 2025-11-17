# Bun Setup Guide

This project uses [Bun](https://bun.sh) as the primary package manager and runtime. Bun is a modern JavaScript runtime with a built-in package manager that's significantly faster than npm/yarn.

## Quick Start

### Installation

If you don't have Bun installed, follow the [official installation guide](https://bun.sh/docs/installation).

```bash
# Quick install (macOS/Linux)
curl -fsSL https://bun.sh/install | bash

# Or with brew (macOS)
brew install oven-sh/bun/bun
```

### Project Setup

```bash
# Clone the repository
git clone git://github.com/TheBoroer/localtunnel-server.git
cd localtunnel-server

# Install dependencies (creates/uses bun.lock)
bun install

# Run the server
bun run start --port 3000

# Or in development mode with auto-reload
bun run dev --port 3000

# Run tests
bun run test
```

## Workflow

### Running the Server

```bash
# Standard start
bun run start

# With custom port
bun run start --port 8080

# Development mode (auto-reload on file changes)
bun run dev --port 3000
```

### Running Tests

This project uses **Mocha** for testing, not Bun's native test runner.

```bash
# Run all tests
bun run test

# Or directly with Mocha
bun mocha --check-leaks '*.test.js' '**/*.test.js'

# Run specific test file
bun mocha auth.test.js

# Run with npm
npm test
```

### Installing Dependencies

```bash
# Install all dependencies
bun install

# Add a new dependency
bun add package-name

# Add a dev dependency
bun add --save-dev package-name

# Remove a dependency
bun remove package-name

# Update dependencies
bun update
```

## Benefits of Using Bun

1. **Speed** - Significantly faster installation and test execution than npm
2. **Native ESM** - Full support for ES modules without additional configuration
3. **Built-in Test Runner** - No need for separate test frameworks in many cases
4. **Global Binaries** - Bunx allows running packages without installation
5. **Zero-Config TypeScript** - If you ever need TypeScript, it just works

## Lock File Management

The `bun.lock` file is the lockfile for Bun's package manager and should be:

- **Committed to version control** - Ensures consistent dependencies across environments
- **Not manually edited** - Always use `bun add/remove` commands
- **Preferred over package-lock.json** - Git should prefer this for dependency resolution

## Migrating from npm

If you're switching from npm to Bun:

```bash
# Remove old lock files and node_modules
rm -rf node_modules package-lock.json

# Install with Bun
bun install

# This creates a new bun.lock file
```

## Development Best Practices

### Environment Variables

Create a `.env` file for local development:

```bash
PORT=3000
DOMAIN=example.com
DEBUG=localtunnel:*
```

Then load with:

```bash
bun run dev
```

Bun automatically loads `.env` files.

### Debugging

Run with debug output:

```bash
DEBUG=localtunnel:* bun run start
```

### Type Checking

If you add TypeScript files, Bun will automatically check them:

```bash
# Type check without running
bun check
```

## Docker Integration

### Using Bun in Docker

Create a Dockerfile:

```dockerfile
FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --production

# Copy source code
COPY . .

EXPOSE 3000

CMD ["bun", "run", "start", "--port", "3000"]
```

Build and run:

```bash
docker build -t localtunnel-server .
docker run -p 3000:3000 localtunnel-server
```

## Troubleshooting

### Bun not found

Make sure Bun is in your PATH:

```bash
~/.bun/bin/bun --version
```

Add to your shell profile if needed:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

### Dependency conflicts

Clear cache and reinstall:

```bash
rm -rf bun.lock node_modules .bun
bun install
```

### Tests failing

Make sure you're using the correct test command (this project uses Mocha, not Bun's test runner):

```bash
# Using npm script
bun run test

# Or run Mocha directly
bun mocha --check-leaks '*.test.js' '**/*.test.js'

# Or with npm
npm test
```

## Compatibility

- **Node.js modules**: Full compatibility with npm packages
- **npm/yarn lockfiles**: Can be converted to `bun.lock`
- **npm scripts**: All scripts in package.json work with Bun
- **ESM & CommonJS**: Both fully supported

## Resources

- [Bun Official Documentation](https://bun.sh)
- [Bun Package Manager](https://bun.sh/docs/cli/install)
- [Bun API Reference](https://bun.sh/docs/api)
- [Bun CLI Reference](https://bun.sh/docs/cli)
