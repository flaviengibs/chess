const request = require('supertest');
const { io: ioClient } = require('socket.io-client');

describe('Server Infrastructure Tests', () => {
  let server;
  let io;
  let app;
  let serverPort;

  beforeAll((done) => {
    // Import the server modules
    const serverModule = require('../index');
    app = serverModule.app;
    server = serverModule.server;
    io = serverModule.io;

    // Wait for server to be listening
    if (server.listening) {
      serverPort = server.address().port;
      done();
    } else {
      server.on('listening', () => {
        serverPort = server.address().port;
        done();
      });
    }
  });

  afterAll((done) => {
    // Close the server after tests
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('Express Server', () => {
    test('should start on specified port', () => {
      const address = server.address();
      expect(address).toBeTruthy();
      expect(address.port).toBeDefined();
      expect(typeof address.port).toBe('number');
    });

    test('should serve static files correctly', async () => {
      const response = await request(app).get('/index.html');
      expect(response.status).toBe(200);
      expect(response.type).toMatch(/html/);
    });

    test('should serve CSS files correctly', async () => {
      const response = await request(app).get('/styles.css');
      expect(response.status).toBe(200);
      expect(response.type).toMatch(/css/);
    });

    test('should serve JavaScript files correctly', async () => {
      const response = await request(app).get('/js/app.js');
      expect(response.status).toBe(200);
      expect(response.type).toMatch(/javascript/);
    });

    test('should return 404 for non-existent files', async () => {
      const response = await request(app).get('/nonexistent.html');
      expect(response.status).toBe(404);
    });

    test('should handle CORS headers correctly', async () => {
      const response = await request(app).get('/index.html');
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Socket.IO Server', () => {
    test('should be properly attached to HTTP server', () => {
      expect(io).toBeDefined();
      expect(io.engine).toBeDefined();
    });

    test('should accept client connections', (done) => {
      const clientSocket = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        forceNew: true
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        clientSocket.disconnect();
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    test('should log connection events', (done) => {
      const clientSocket = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        forceNew: true
      });

      // Listen for connection on server side
      io.once('connection', (socket) => {
        expect(socket.id).toBeDefined();
        clientSocket.disconnect();
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    test('should handle disconnection events', (done) => {
      const clientSocket = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        forceNew: true
      });

      io.once('connection', (socket) => {
        socket.once('disconnect', (reason) => {
          expect(reason).toBeDefined();
          done();
        });

        // Disconnect the client
        clientSocket.disconnect();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    test('should handle multiple concurrent connections', (done) => {
      const client1 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        forceNew: true
      });
      const client2 = ioClient(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        forceNew: true
      });

      let connectedCount = 0;
      const checkBothConnected = () => {
        connectedCount++;
        if (connectedCount === 2) {
          expect(client1.connected).toBe(true);
          expect(client2.connected).toBe(true);
          expect(client1.id).not.toBe(client2.id);
          client1.disconnect();
          client2.disconnect();
          done();
        }
      };

      client1.on('connect', checkBothConnected);
      client2.on('connect', checkBothConnected);

      client1.on('connect_error', done);
      client2.on('connect_error', done);
    });

    test('should assign unique socket IDs to each connection', (done) => {
      const socketIds = new Set();
      let connectionCount = 0;
      const totalConnections = 3;

      const connectionHandler = (socket) => {
        socketIds.add(socket.id);
        connectionCount++;

        if (connectionCount === totalConnections) {
          expect(socketIds.size).toBe(totalConnections);
          io.off('connection', connectionHandler);
          done();
        }
      };

      io.on('connection', connectionHandler);

      // Create multiple clients
      const clients = [];
      for (let i = 0; i < totalConnections; i++) {
        const client = ioClient(`http://localhost:${serverPort}`, {
          transports: ['websocket'],
          forceNew: true
        });
        clients.push(client);
        client.on('connect_error', done);
      }

      // Clean up after test
      setTimeout(() => {
        clients.forEach(client => client.disconnect());
      }, 100);
    });
  });
});
