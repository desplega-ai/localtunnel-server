import log from 'book';
import Koa from 'koa';
import tldjs from 'tldjs';
import Debug from 'debug';
import http from 'http';
import { hri } from 'human-readable-ids';
import { humanId } from 'human-id';
import Router from 'koa-router';

import ClientManager from './lib/ClientManager.js';
import { parseBasicAuth, generatePassword } from './lib/authUtils.js';

const debug = Debug('localtunnel:server');

const getEndpointIps = (request) => {
    // request.headers['x-forwarded-for'] could be a comma separated list of IPs (if client is behind proxies)
    // TODO: change this to use request-ip package or something better to prevent x-forwarded-for spoofing?
    return request.headers['x-forwarded-for'] || request.ip;
};

/**
 * Validate Basic Auth for a request against a client's credentials
 * @returns {boolean} true if auth is valid or not required, false if auth failed
 */
function validateTunnelAuth(req, client) {
    // If client doesn't require auth, allow the request
    if (!client.requiresAuth()) {
        return true;
    }

    // Client requires auth, check Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return false;
    }

    const credentials = parseBasicAuth(authHeader);
    if (!credentials) {
        return false;
    }

    return client.validateAuth(credentials.username, credentials.password);
}

export default function (opt) {
    opt = opt || {};

    const validHosts = opt.domain ? [opt.domain] : undefined;
    const myTldjs = tldjs.fromUserSettings({ validHosts });
    const landingPage = opt.landing || 'https://localtunnel.github.io/www/';

    function GetClientIdFromHostname(hostname) {
        // from pull request: https://github.com/localtunnel/server/pull/118
        const hostnameAndPort = hostname.split(':');
        return myTldjs.getSubdomain(hostnameAndPort[0]);
    }

    const manager = new ClientManager(opt);

    const schema = opt.secure ? 'https' : 'http';

    const app = new Koa();
    const router = new Router();

    router.get('/api/status', async (ctx, next) => {
        const stats = manager.stats;
        ctx.body = {
            tunnels: stats.tunnels,
            mem: process.memoryUsage(),
        };
    });

    router.get('/api/tunnels/:id/status', async (ctx, next) => {
        const clientId = ctx.params.id;
        const client = manager.getClient(clientId);
        if (!client) {
            ctx.throw(404);
            return;
        }

        const stats = client.stats();
        ctx.body = {
            connected_sockets: stats.connectedSockets,
        };
    });

    app.use(router.routes());
    app.use(router.allowedMethods());

    // root endpoint
    app.use(async (ctx, next) => {
        const path = ctx.request.path;
        const endpointIp = getEndpointIps(ctx.request);

        // skip anything not on the root path
        if (path !== '/') {
            await next();
            return;
        }

        const isNewClientRequest = ctx.query['new'] !== undefined;
        if (isNewClientRequest) {
            // const reqId = hri.random();

            const randomId = humanId({
                separator: '-',
                capitalize: false,
            });
            // const reqId = `${randomId}-${endpointIp.replace(/\./g, '-')}`;

            const reqId = `${randomId}`;

            debug(`new client request on '/' for id: '${reqId}'`);

            // Handle optional authentication
            const authOptions = {};
            const username = ctx.query.username;
            if (username) {
                authOptions.username = username;
                // Auto-generate password if not provided
                authOptions.password = ctx.query.password || generatePassword();
            }

            const info = await manager.newClient(reqId, ctx, authOptions);

            let url = schema + '://' + info.id + '.' + opt.domain || ctx.request.host;

            // Include credentials in URL if authentication is enabled
            if (info.username && info.password) {
                url = schema + '://' + info.username + ':' + info.password + '@' + info.id + '.' + (opt.domain || ctx.request.host);
            }

            info.url = url;

            ctx.set('x-localtunnel-subdomain', info.id);
            ctx.set('x-localtunnel-endpoint', endpointIp);

            ctx.body = info;
            return;
        }

        // no new client request, render hello page
        const host = ctx.request.host;
        const tunnelUrl = `${schema}://${host}`;
        const createTunnelCmd = `curl "${tunnelUrl}/?new"`;
        const createAuthCmd = `curl "${tunnelUrl}/?new&username=admin&password=secret"`;

        ctx.type = 'text/html';
        ctx.body = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Localtunnel Server</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            max-width: 600px;
            text-align: center;
        }
        h1 {
            color: #667eea;
            margin: 0 0 20px 0;
            font-size: 2.5em;
        }
        p {
            color: #666;
            line-height: 1.6;
            margin: 15px 0;
        }
        .code {
            background: #f5f5f5;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            overflow-x: auto;
            word-break: break-all;
        }
        .server-info {
            background: #f0f4ff;
            border: 1px solid #667eea;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            color: #667eea;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            border-radius: 5px;
            text-decoration: none;
            margin: 10px 5px;
            transition: background 0.3s;
            font-weight: 500;
        }
        .button:hover {
            background: #764ba2;
        }
        .button.secondary {
            background: #f5f5f5;
            color: #333;
            border: 2px solid #667eea;
        }
        .button.secondary:hover {
            background: #f0f0f0;
        }
        .features {
            text-align: left;
            margin: 30px 0;
            padding: 20px 0;
            border-top: 1px solid #eee;
            border-bottom: 1px solid #eee;
        }
        .features h3 {
            color: #667eea;
            margin-top: 0;
        }
        .features ul {
            list-style: none;
            padding: 0;
        }
        .features li {
            padding: 8px 0;
            color: #666;
        }
        .features li:before {
            content: "✓ ";
            color: #667eea;
            font-weight: bold;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Localtunnel</h1>
        <p>Expose your localhost to the world for easy testing and sharing!</p>

        <div class="server-info">
            Server: <strong>${host}</strong>
        </div>

        <div class="features">
            <h3>Features</h3>
            <ul>
                <li>No need to mess with DNS or deploy</li>
                <li>Optional HTTP Basic Authentication</li>
                <li>Support for WebSockets</li>
                <li>Auto-generated or custom credentials</li>
            </ul>
        </div>

        <h3>Quick Start</h3>
        <p>Create a new tunnel:</p>
        <div class="code">${createTunnelCmd}</div>

        <p>Create a tunnel with authentication:</p>
        <div class="code">${createAuthCmd}</div>

        <div style="margin-top: 30px;">
            <a href="${tunnelUrl}/?new" class="button">Create Tunnel</a>
            <a href="https://github.com/localtunnel/server" class="button secondary">GitHub</a>
        </div>

        <p style="color: #999; font-size: 0.9em; margin-top: 30px;">
            Localtunnel Server is running and ready to accept connections.
        </p>
    </div>
</body>
</html>`;

    });

    // anything after the / path is a request for a specific client name
    // This is a backwards compat feature
    app.use(async (ctx, next) => {
        const parts = ctx.request.path.split('/');
        const endpointIp = getEndpointIps(ctx.request);

        // any request with several layers of paths is not allowed
        // rejects /foo/bar
        // allow /foo
        if (parts.length !== 2) {
            await next();
            return;
        }

        const reqId = parts[1];

        // limit requested hostnames to 63 characters
        if (
            !/^(?:[a-z0-9][a-z0-9\-]{4,63}[a-z0-9]|[a-z0-9]{4,63})$/.test(reqId)
        ) {
            const msg =
                'Invalid subdomain. Subdomains must be lowercase and between 4 and 63 alphanumeric characters.';
            ctx.status = 403;
            ctx.body = {
                message: msg,
            };
            return;
        }

        debug(`new client request on '${ctx.path}' for id '${reqId}'`);

        // Handle optional authentication
        const authOptions = {};
        const username = ctx.query.username;
        if (username) {
            authOptions.username = username;
            // Auto-generate password if not provided
            authOptions.password = ctx.query.password || generatePassword();
        }

        const info = await manager.newClient(reqId, ctx, authOptions);

        let url = schema + '://' + info.id + '.' + opt.domain || ctx.request.host;

        // Include credentials in URL if authentication is enabled
        if (info.username && info.password) {
            url = schema + '://' + info.username + ':' + info.password + '@' + info.id + '.' + (opt.domain || ctx.request.host);
        }

        info.url = url;

        ctx.set('x-localtunnel-subdomain', info.id);
        ctx.set('x-localtunnel-endpoint', endpointIp);

        ctx.body = info;
        return;
    });

    const server = http.createServer();

    const appCallback = app.callback();

    server.on('request', (req, res) => {
        // without a hostname, we won't know who the request is for
        const hostname = req.headers.host;
        if (!hostname) {
            res.statusCode = 400;
            res.end('Host header is required');
            return;
        }

        const clientId = GetClientIdFromHostname(hostname);
        if (!clientId) {
            appCallback(req, res);
            return;
        }

        const client = manager.getClient(clientId);
        if (!client) {
            // res.statusCode = 523;
            // res.end('523 -  Origin tunnel is unreachable');
            res.statusCode = 503;
            res.setHeader('X-Localtunnel-Status', 'Tunnel Unavailable');
            res.end('503 - Tunnel Unavailable');
            return;
        }

        // Validate authentication if required
        if (!validateTunnelAuth(req, client)) {
            res.statusCode = 401;
            res.setHeader('WWW-Authenticate', 'Basic realm="Localtunnel"');
            res.end('401 - Unauthorized');
            return;
        }

        client.handleRequest(req, res);
    });

    server.on('upgrade', (req, socket, head) => {
        debug('websocket upgrade request: %s %s', req.url, req.headers.host);
        const hostname = req.headers.host;
        if (!hostname) {
            socket.write('HTTP/1.1 400 Bad Request\r\n');
            socket.write('Content-Type: text/plain\r\n');
            socket.write('\r\n');
            socket.end('400 - Host header is required');
            return;
        }

        const clientId = GetClientIdFromHostname(hostname);
        if (!clientId) {
            socket.write('HTTP/1.1 400 Bad Request\r\n');
            socket.write('Content-Type: text/plain\r\n');
            socket.write('\r\n');
            socket.end('400 - Invalid hostname');
            return;
        }

        const client = manager.getClient(clientId);
        if (!client) {
            socket.write('HTTP/1.1 503 Service Unavailable\r\n');
            socket.write('Content-Type: text/plain\r\n');
            socket.write('X-Localtunnel-Status: Tunnel Unavailable\r\n');
            socket.write('\r\n');
            socket.end('503 - Tunnel Unavailable');
            return;
        }

        // Validate authentication if required
        if (!validateTunnelAuth(req, client)) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n');
            socket.write('WWW-Authenticate: Basic realm="Localtunnel"\r\n');
            socket.write('Content-Type: text/plain\r\n');
            socket.write('\r\n');
            socket.end('401 - Unauthorized');
            return;
        }

        client.handleUpgrade(req, socket);
    });

    return server;
}
