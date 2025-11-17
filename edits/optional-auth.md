# Optional Per-Tunnel HTTP Basic Authentication

## Overview
Implemented optional HTTP Basic Authentication for localtunnel tunnels, allowing users to secure tunnel endpoints with username and password credentials.

## Changes Made

### New Files
- **`lib/authUtils.js`** - Authentication utilities module
  - `generatePassword()` - Generates random 12-character alphanumeric passwords
  - `parseBasicAuth(authHeader)` - Parses HTTP Basic Auth headers
  - `createBasicAuthHeader()` - Creates Basic Auth header values
  - `validateCredentials()` - Validates credentials using timing-safe comparison to prevent timing attacks

### Modified Files

#### `lib/Client.js`
- Added `username` and `password` properties to store auth credentials
- Added `requiresAuth()` method to check if tunnel requires authentication
- Added `validateAuth(username, password)` method to validate incoming credentials

#### `lib/ClientManager.js`
- Updated `newClient(id, ctx, options)` signature to accept optional auth options
- Modified to pass `username` and `password` to Client constructor
- Returns auth credentials in tunnel creation response when auth is enabled

#### `server.js`
- Imported auth utilities (`parseBasicAuth`, `generatePassword`)
- Added `validateTunnelAuth(req, client)` helper function for auth validation
- Updated HTTP request handler to validate Basic Auth before proxying requests
- Updated WebSocket upgrade handler to validate Basic Auth before accepting connections
- Enhanced tunnel creation endpoints (`/?new` and `/:id`) to:
  - Accept optional `username` query parameter
  - Accept optional `password` query parameter
  - Auto-generate password if username provided without password
  - Include credentials in returned tunnel URL

### Test File
- **`auth.test.js`** - Comprehensive test suite with 8 tests covering:
  - Backward compatibility (tunnels without auth)
  - Auto-generated passwords
  - Custom credentials
  - Proper 401 response to unauthorized requests
  - Credential validation
  - Basic Auth header processing

## Features

- **Optional & Backward Compatible** - Tunnels can be created with or without authentication
- **Auto-Generated Passwords** - Passwords are randomly generated if not specified
- **URL-Based Credentials** - Supports standard format: `https://user:pass@subdomain.host.com`
- **Browser Support** - Browsers prompt for credentials with standard Basic Auth
- **WebSocket Support** - Authentication validates for both HTTP and WebSocket connections
- **Timing-Safe Validation** - Uses `crypto.timingSafeEqual()` to prevent timing attacks
- **Full Test Coverage** - All 33 tests passing (including 8 new auth tests)

## Usage

### Create tunnel without auth (existing behavior)
```bash
GET /?new
Response: { id: "abc", url: "https://abc.example.com", ... }
```

### Create tunnel with auto-generated password
```bash
GET /?new&username=admin
Response: { id: "abc", username: "admin", password: "a1b2c3d4e5f6g7h8", url: "https://admin:a1b2c3d4e5f6g7h8@abc.example.com", ... }
```

### Create tunnel with custom credentials
```bash
GET /?new&username=user&password=secretpass
Response: { id: "abc", username: "user", password: "secretpass", url: "https://user:secretpass@abc.example.com", ... }
```

### Access authenticated tunnel
```bash
# Browser will prompt for credentials, or use:
curl -u admin:password https://abc.example.com

# Or with Authorization header:
curl -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" https://abc.example.com
```

## Testing
All tests pass:
- Original 25 tests continue to pass (backward compatibility verified)
- 8 new authentication tests verify all auth scenarios
- Authentication does not affect non-protected tunnels
