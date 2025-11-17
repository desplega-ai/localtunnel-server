# Bun Adoption & Configuration

## Overview
Migrated the project to use [Bun](https://bun.sh) as the primary package manager and runtime. Bun provides superior performance and a more modern development experience while maintaining full compatibility with existing Node.js packages.

## Changes Made

### Files Added

#### `bunfig.toml`
Bun configuration file with sensible defaults for:
- Test configuration
- Installation settings
- Bundle/build settings
- Development settings

#### `BUN_SETUP.md`
Comprehensive guide covering:
- Quick start and installation instructions
- Development workflow
- Testing procedures
- Benefits of using Bun
- Lock file management
- Debugging and troubleshooting
- Docker integration with Bun
- Migration guide from npm

### Files Updated

#### `README.md`
- Updated setup instructions to use `bun install` instead of `npm install`
- Added note about Bun as the primary package manager
- Updated start command examples to use `bun run start`
- Added "Development" section with Bun and npm test/dev commands
- Added Docker example using `oven/bun:latest` image
- Added link to detailed BUN_SETUP.md guide

#### `package.json`
- Added `engines` field specifying Bun >=1.0.0
- Maintained backward compatibility with npm/yarn scripts

## Benefits

1. **Performance** - Significantly faster dependency installation and test execution
2. **Native ESM Support** - No additional configuration needed for ES modules
3. **Simpler Setup** - Single executable, no additional tools needed
4. **Built-in Tools** - Includes test runner, bundler, and package manager
5. **Modern Developer Experience** - Faster feedback loops during development

## Lock File Strategy

- **bun.lock** - Primary lock file, should be committed to version control
- **package-lock.json** - Legacy npm lock file, kept for backward compatibility
- Developers can use either `bun`, `npm`, or `yarn` depending on preference

## Quick Commands

```bash
# Install dependencies
bun install

# Start the server
bun run start --port 3000

# Development mode with auto-reload
bun run dev --port 3000

# Run tests
bun test

# Add a dependency
bun add package-name

# Add a dev dependency
bun add --save-dev package-name
```

## Backward Compatibility

The project remains fully compatible with npm and yarn:

```bash
# Using npm
npm install
npm run start

# Using yarn
yarn install
yarn start
```

## Docker

Recommended Dockerfile for Bun:

```dockerfile
FROM oven/bun:latest

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production
COPY . .

EXPOSE 3000
CMD ["bun", "run", "start", "--port", "3000"]
```

## Future Considerations

- Bun's TypeScript support: Zero-config TypeScript support is available if needed
- Bun's bundler: Can be used for production builds via `bunfig.toml`
- Bun's API: Native HTTP server can be used to replace Koa in future refactors
- Performance monitoring: Bun has built-in profiling capabilities

## Resources

- [Bun Official Website](https://bun.sh)
- [Bun Documentation](https://bun.sh/docs)
- [Bun Package Manager Guide](https://bun.sh/docs/cli/install)
- [Bun CLI Reference](https://bun.sh/docs/cli)
