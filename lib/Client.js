import http from 'http';
import Debug from 'debug';
import pump from 'pump';
import EventEmitter from 'events';
import { validateCredentials } from './authUtils.js';

// A client encapsulates req/res handling using an agent
//
// If an agent is destroyed, the request handling will error
// The caller is responsible for handling a failed request
class Client extends EventEmitter {
    constructor(options) {
        super();

        const agent = (this.agent = options.agent);
        const id = (this.id = options.id);

        // Optional authentication credentials
        this.username = options.username || null;
        this.password = options.password || null;

        // Store whether the server is running in secure mode
        this.secure = options.secure || false;

        this.debug = Debug(`lt:Client[${this.id}]`);

        // client is given a grace period in which they can connect before they are _removed_
        this.graceTimeout = setTimeout(() => {
            this.close();
        }, 1000).unref();

        agent.on('online', () => {
            this.debug('client online %s', id);
            clearTimeout(this.graceTimeout);
        });

        agent.on('offline', () => {
            this.debug('client offline %s', id);

            // if there was a previous timeout set, we don't want to double trigger
            clearTimeout(this.graceTimeout);

            // client is given a grace period in which they can re-connect before they are _removed_
            this.graceTimeout = setTimeout(() => {
                this.close();
            }, 1000).unref();
        });

        // TODO(roman): an agent error removes the client, the user needs to re-connect?
        // how does a user realize they need to re-connect vs some random client being assigned same port?
        agent.once('error', (err) => {
            this.debug('agent error: %s', err.message);
            // Emit error so pending requests can be notified
            this.emit('error', err);
            this.close();
        });
    }

    getAgentIps() {
        return this.agent.agentIps;
    }

    stats() {
        return this.agent.stats();
    }

    /**
     * Check if this client requires authentication
     * @returns {boolean}
     */
    requiresAuth() {
        return this.username !== null && this.password !== null;
    }

    /**
     * Validate provided credentials against client's auth
     * @param {string} username
     * @param {string} password
     * @returns {boolean}
     */
    validateAuth(username, password) {
        if (!this.requiresAuth()) {
            return true; // No auth required
        }

        try {
            return validateCredentials(username, password, this.username, this.password);
        } catch (err) {
            this.debug('auth validation error: %s', err.message);
            return false;
        }
    }

    close() {
        clearTimeout(this.graceTimeout);
        this.agent.destroy();
        this.emit('close');
    }

    handleRequest(req, res) {
        this.debug('> %s', req.url);

        // Debug: Log incoming headers
        this.debug('Incoming X-Forwarded-Proto: %s', req.headers['x-forwarded-proto']);
        this.debug('Secure flag: %s', this.secure);

        // Set X-Forwarded-Proto if not already set by upstream proxy (like Caddy)
        // Since Caddy already sets it, we just pass through req.headers directly
        // to avoid any issues with object spreading
        if (!req.headers['x-forwarded-proto'] && this.secure) {
            req.headers['x-forwarded-proto'] = 'https';
            this.debug('Setting X-Forwarded-Proto to: https');
        }

        // Set X-Forwarded-Host if not already set
        if (!req.headers['x-forwarded-host'] && req.headers.host) {
            req.headers['x-forwarded-host'] = req.headers.host;
        }

        // Debug: Log all headers being sent to local app
        this.debug('Headers to local app: %O', req.headers);

        const opt = {
            path: req.url,
            agent: this.agent,
            method: req.method,
            headers: req.headers,
        };

        const clientReq = http.request(opt, (clientRes) => {
            this.debug('< %s', req.url);

            // Inject Custom Headers Here

            // restrict bot/spiders/search engines
            clientRes.headers['X-Robots-Tag'] =
                'noindex, nofollow, noarchive, nosnippet, nositelinksearchbox, noimageindex';

            // expose the real source ip
            const clientIps = this.getAgentIps();
            if (clientIps && clientIps.length > 0) {
                clientRes.headers['X-Localtunnel-Agent-Ips'] = JSON.stringify(
                    this.getAgentIps(),
                );
            }

            // write response code and headers
            res.writeHead(clientRes.statusCode, clientRes.headers);

            // using pump is deliberate - see the pump docs for why
            pump(clientRes, res, (err) => {
                if (err) {
                    this.debug('response pump error: %s', err.message);
                    // Response is already in progress, just ensure cleanup
                    if (!res.finished) {
                        res.destroy();
                    }
                }
            });
        });

        // this can happen when underlying agent produces an error
        // in our case we 504 gateway error this?
        // if we have already sent headers?
        clientReq.once('error', (err) => {
            this.debug('request error: %s', err.message);

            // Only send error response if headers haven't been sent yet
            if (!res.headersSent) {
                res.writeHead(502, {
                    'Content-Type': 'text/plain',
                    'X-Localtunnel-Error': 'Local server unavailable'
                });
                res.end('502 - Bad Gateway: Local server is not available');
            } else {
                // If headers were already sent, just end the response
                res.end();
            }
        });

        // using pump is deliberate - see the pump docs for why
        pump(req, clientReq, (err) => {
            if (err) {
                this.debug('request pump error: %s', err.message);
                // If we haven't sent headers yet, send an error response
                if (!res.headersSent) {
                    res.writeHead(502, {
                        'Content-Type': 'text/plain',
                        'X-Localtunnel-Error': 'Request streaming failed'
                    });
                    res.end('502 - Bad Gateway: Request streaming error');
                }
            }
        });
    }

    handleUpgrade(req, socket) {
        this.debug('> [up] %s', req.url);
        socket.once('error', (err) => {
            // These client side errors can happen if the client dies while we are reading
            // We don't need to surface these in our logs.
            if (err.code == 'ECONNRESET' || err.code == 'ETIMEDOUT') {
                return;
            }
            console.error(err);
        });

        this.agent.createConnection({}, (err, conn) => {
            this.debug('< [up] %s', req.url);
            // any errors getting a connection mean we cannot service this request
            if (err) {
                socket.end();
                return;
            }

            // socket met have disconnected while we waiting for a socket
            if (!socket.readable || !socket.writable) {
                conn.destroy();
                socket.end();
                return;
            }

            // Clear the default socket timeout for WebSocket connections
            // WebSocket connections are long-lived and should not timeout
            if (conn.setTimeout) {
                conn.setTimeout(0);
                this.debug('cleared socket timeout for websocket connection');
            }

            // websocket requests are special in that we simply re-create the header info
            // then directly pipe the socket data
            // avoids having to rebuild the request and handle upgrades via the http client
            const arr = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
            for (let i = 0; i < req.rawHeaders.length - 1; i += 2) {
                arr.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
            }

            arr.push('');
            arr.push('');

            // using pump is deliberate - see the pump docs for why
            pump(conn, socket, (err) => {
                if (err) {
                    this.debug('websocket pump error (conn->socket): %s', err.message);
                    socket.destroy();
                }
            });
            pump(socket, conn, (err) => {
                if (err) {
                    this.debug('websocket pump error (socket->conn): %s', err.message);
                    conn.destroy();
                }
            });
            conn.write(arr.join('\r\n'));
        });
    }
}

export default Client;
