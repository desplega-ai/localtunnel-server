import crypto from 'crypto';

/**
 * Generate a random password for tunnel authentication
 * @returns {string} A 12-character random password (alphanumeric)
 */
export function generatePassword() {
    return crypto.randomBytes(9).toString('hex');
}

/**
 * Parse Basic Auth header
 * @param {string} authHeader - The Authorization header value (e.g., "Basic dXNlcjpwYXNz")
 * @returns {{username: string, password: string} | null} Parsed credentials or null if invalid
 */
export function parseBasicAuth(authHeader) {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return null;
    }

    try {
        const base64Credentials = authHeader.slice(6);
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');

        if (username && password !== undefined) {
            return { username, password };
        }
        return null;
    } catch (err) {
        return null;
    }
}

/**
 * Create Basic Auth header value
 * @param {string} username
 * @param {string} password
 * @returns {string} Authorization header value (e.g., "Basic dXNlcjpwYXNz")
 */
export function createBasicAuthHeader(username, password) {
    const credentials = `${username}:${password}`;
    const base64 = Buffer.from(credentials).toString('base64');
    return `Basic ${base64}`;
}

/**
 * Validate credentials against expected username and password
 * @param {string} username - Provided username
 * @param {string} password - Provided password
 * @param {string} expectedUsername - Expected username
 * @param {string} expectedPassword - Expected password
 * @returns {boolean} True if credentials match
 */
export function validateCredentials(username, password, expectedUsername, expectedPassword) {
    // Use constant-time comparison to prevent timing attacks
    return (
        crypto.timingSafeEqual(Buffer.from(username), Buffer.from(expectedUsername)) &&
        crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expectedPassword))
    );
}
