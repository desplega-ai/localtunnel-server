import assert from 'assert';
import ClientManager from './lib/ClientManager.js';
import TunnelAgent from './lib/TunnelAgent.js';

describe('ClientManager', () => {
    it('should pass maxTcpSockets to TunnelAgent from configured max_tcp_sockets', async () => {
        const manager = new ClientManager({ max_tcp_sockets: 25 });

        // newClient creates a TunnelAgent and starts listening
        // We need to call it and then inspect the agent on the created client
        const info = await manager.newClient('test-client');

        const client = manager.getClient('test-client');
        assert(client, 'client should exist');

        // The agent should have the configured maxTcpSockets value
        assert.equal(client.agent.maxTcpSockets, 25,
            'TunnelAgent should receive maxTcpSockets from ClientManager opt.max_tcp_sockets');

        // Clean up
        manager.removeClient('test-client');
    });

    it('should use default maxTcpSockets (10) when max_tcp_sockets is not configured', async () => {
        const manager = new ClientManager({});

        const info = await manager.newClient('test-default');

        const client = manager.getClient('test-default');
        assert(client, 'client should exist');

        // Default should be 10 (DEFAULT_MAX_SOCKETS in TunnelAgent.js)
        assert.equal(client.agent.maxTcpSockets, 10,
            'TunnelAgent should fall back to default maxTcpSockets of 10');

        manager.removeClient('test-default');
    });

    it('should return max_conn_count matching the configured value', async () => {
        const manager = new ClientManager({ max_tcp_sockets: 50 });

        const info = await manager.newClient('test-count');

        assert.equal(info.max_conn_count, 50,
            'newClient response should report max_conn_count matching configured value');

        manager.removeClient('test-count');
    });
});
