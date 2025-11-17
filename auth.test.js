import request from 'supertest';
import assert from 'assert';
import net from 'net';
import http from 'http';
import createServer from './server.js';

describe('Authentication', () => {
    it('should create tunnel without auth (backward compatibility)', async () => {
        const server = createServer({
            domain: 'example.com',
        });
        await new Promise((resolve) => server.listen(resolve));

        const res = await request(server).get('/?new');
        assert.equal(res.status, 200);
        assert(res.body.id);
        assert(!res.body.username);
        assert(!res.body.password);
        assert(res.body.url.includes(res.body.id));
        assert(!res.body.url.includes('@'));

        await new Promise((resolve) => server.close(resolve));
    });

    it('should create tunnel with auth and auto-generated password', async () => {
        const server = createServer({
            domain: 'example.com',
        });
        await new Promise((resolve) => server.listen(resolve));

        const res = await request(server).get('/?new&username=testuser');
        assert.equal(res.status, 200);
        assert(res.body.id);
        assert.equal(res.body.username, 'testuser');
        assert(res.body.password);
        assert.equal(res.body.password.length, 18); // 9 bytes hex = 18 chars
        assert(res.body.url.includes('testuser:'));
        assert(res.body.url.includes('@'));

        await new Promise((resolve) => server.close(resolve));
    });

    it('should create tunnel with auth and custom password', async () => {
        const server = createServer({
            domain: 'example.com',
        });
        await new Promise((resolve) => server.listen(resolve));

        const res = await request(server).get(
            '/?new&username=admin&password=secretpass123',
        );
        assert.equal(res.status, 200);
        assert.equal(res.body.username, 'admin');
        assert.equal(res.body.password, 'secretpass123');
        assert(res.body.url.includes('admin:secretpass123@'));

        await new Promise((resolve) => server.close(resolve));
    });

    it('should reject requests without auth to protected tunnel', async () => {
        const server = createServer({
            domain: 'example.com',
        });
        await new Promise((resolve) => server.listen(resolve));

        // Create protected tunnel
        const setupRes = await request(server).get(
            '/?new&username=admin&password=secret',
        );
        const tunnelId = setupRes.body.id;

        // Try to access without auth
        const res = await request(server)
            .get('/')
            .set('Host', `${tunnelId}.example.com`);

        assert.equal(res.status, 401);
        assert(res.text.includes('Unauthorized'));
        assert.equal(res.get('WWW-Authenticate'), 'Basic realm="Localtunnel"');

        await new Promise((resolve) => server.close(resolve));
    });

    it('should reject requests with wrong credentials to protected tunnel', async () => {
        const server = createServer({
            domain: 'example.com',
        });
        await new Promise((resolve) => server.listen(resolve));

        // Create protected tunnel
        const setupRes = await request(server).get(
            '/?new&username=admin&password=secret',
        );
        const tunnelId = setupRes.body.id;

        // Try with wrong credentials
        const wrongAuthHeader = Buffer.from('admin:wrongpass').toString('base64');
        const res = await request(server)
            .get('/')
            .set('Host', `${tunnelId}.example.com`)
            .set('Authorization', `Basic ${wrongAuthHeader}`);

        assert.equal(res.status, 401);

        await new Promise((resolve) => server.close(resolve));
    });

    it('should allow requests with correct basic auth credentials', async () => {
        const server = createServer({
            domain: 'example.com',
        });
        await new Promise((resolve) => server.listen(resolve));

        // Create protected tunnel with a real backend
        const setupRes = await request(server).get(
            '/?new&username=admin&password=secret',
        );
        const tunnelId = setupRes.body.id;
        const localPort = setupRes.body.port;

        // Create a simple backend server
        const backendServer = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });

        await new Promise((resolve) => backendServer.listen(0, resolve));
        const backendPort = backendServer.address().port;

        // Connect tunnel to backend
        const client = net.createConnection({ port: localPort });
        const backend = net.createConnection({ port: backendPort });
        client.pipe(backend).pipe(client);

        // Give it a moment to connect
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Request with correct credentials
        const correctAuthHeader = Buffer.from('admin:secret').toString('base64');
        const res = await request(server)
            .get('/')
            .set('Host', `${tunnelId}.example.com`)
            .set('Authorization', `Basic ${correctAuthHeader}`);

        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { success: true });

        client.destroy();
        backend.destroy();
        backendServer.close();
        await new Promise((resolve) => server.close(resolve));
    });

    it('should support auth on named tunnel creation endpoint', async () => {
        const server = createServer({
            domain: 'example.com',
        });
        await new Promise((resolve) => server.listen(resolve));

        const res = await request(server).get(
            '/myname?username=user1&password=pass123',
        );
        assert.equal(res.status, 200);
        assert.equal(res.body.id, 'myname');
        assert.equal(res.body.username, 'user1');
        assert.equal(res.body.password, 'pass123');

        await new Promise((resolve) => server.close(resolve));
    });

    it('should not require auth for non-protected tunnels', async () => {
        const server = createServer({
            domain: 'example.com',
        });
        await new Promise((resolve) => server.listen(resolve));

        // Create non-protected tunnel
        const setupRes = await request(server).get('/?new');
        const tunnelId = setupRes.body.id;
        const localPort = setupRes.body.port;

        // Create a simple backend
        const backendServer = http.createServer((req, res) => {
            res.writeHead(200);
            res.end('OK');
        });

        await new Promise((resolve) => backendServer.listen(0, resolve));
        const backendPort = backendServer.address().port;

        // Connect tunnel
        const client = net.createConnection({ port: localPort });
        const backend = net.createConnection({ port: backendPort });
        client.pipe(backend).pipe(client);

        await new Promise((resolve) => setTimeout(resolve, 100));

        // Request without auth should work
        const res = await request(server)
            .get('/')
            .set('Host', `${tunnelId}.example.com`);

        assert.equal(res.status, 200);
        assert.equal(res.text, 'OK');

        client.destroy();
        backend.destroy();
        backendServer.close();
        await new Promise((resolve) => server.close(resolve));
    });
});
