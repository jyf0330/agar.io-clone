/*jshint expr:true */

'use strict';

const expect = require('chai').expect;
const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const ioClient = require('socket.io-client');
const net = require('net');
const os = require('os');
const path = require('path');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

function waitForHttp(port, options) {
  const startedAt = Date.now();
  const settings = options || {};
  const timeoutMs = settings.timeoutMs || 30000;
  const getEarlyFailure = settings.getEarlyFailure || function () {
    return null;
  };

  return new Promise((resolve, reject) => {
    function check() {
      const earlyFailure = getEarlyFailure();
      if (earlyFailure) {
        reject(earlyFailure);
        return;
      }

      const request = http.get({
        hostname: '127.0.0.1',
        port,
        path: '/',
        timeout: 500
      }, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error('server did not become reachable on port ' + port));
          return;
        }
        setTimeout(check, 100);
      });
      request.on('timeout', () => {
        request.destroy();
      });
    }

    check();
  });
}

function waitForSocketEvent(socket, eventName, trigger, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error('timed out waiting for ' + eventName));
    }, timeoutMs || 10000);

    function handler() {
      clearTimeout(timer);
      resolve(Array.prototype.slice.call(arguments));
    }

    socket.once(eventName, handler);
    if (typeof trigger === 'function') {
      trigger();
    }
  });
}

function createClient(port, type) {
  return ioClient('http://127.0.0.1:' + port, {
    query: {
      type: type || 'player'
    },
    transports: ['websocket'],
    reconnection: false,
    forceNew: true
  });
}

function readRows(dbPath, query) {
  const payload = JSON.stringify({
    dbPath,
    query
  });
  const script = [
    'import json, sqlite3, sys',
    'payload = json.loads(sys.stdin.read())',
    'conn = sqlite3.connect(payload["dbPath"])',
    'conn.row_factory = sqlite3.Row',
    'try:',
    '    rows = [dict(row) for row in conn.execute(payload["query"]).fetchall()]',
    '    print(json.dumps(rows))',
    'finally:',
    '    conn.close()'
  ].join('\n');
  const result = childProcess.spawnSync(process.env.PYTHON || process.env.PYTHON3 || 'python3', ['-c', script], {
    input: payload,
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'sqlite read failed').trim());
  }

  return JSON.parse(result.stdout || '[]');
}

describe('socket flow integration', function () {
  this.timeout(45000);

  let serverProcess;
  let tmpDir;
  let port;
  let serverDbPath;
  let memoryDbPath;
  const clients = [];

  beforeEach(async function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agar-socket-flow-'));
    port = await getFreePort();
    serverDbPath = path.join(tmpDir, 'server.sqlite3');
    memoryDbPath = path.join(tmpDir, 'memory.sqlite3');
    serverProcess = childProcess.spawn(process.execPath, ['apps/server/src/server.js'], {
      cwd: path.resolve(__dirname, '../..'),
      env: Object.assign({}, process.env, {
        PORT: String(port),
        IP: '127.0.0.1',
        SERVER_DB_PATH: serverDbPath,
        MEMORY_DB_PATH: memoryDbPath,
        LLM_CACHE_DB_PATH: path.join(tmpDir, 'llm-cache.sqlite3'),
        LLM_AUDIT_DIR: path.join(tmpDir, 'llm-audit'),
        V5_NPC_ENABLED: '0',
        V5_GHOST_PERSISTENCE: '0',
        V5_GHOST_TRACE_RECORDING: '0'
      }),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let serverExitError = null;

    serverProcess.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });
    serverProcess.stdout.on('data', () => {});
    serverProcess.once('exit', (code, signal) => {
      serverExitError = new Error('server exited before becoming reachable on port ' + port + ' code=' + code + ' signal=' + signal);
    });

    await waitForHttp(port, {
      timeoutMs: 30000,
      getEarlyFailure: () => serverExitError
    });
  });

  afterEach(function (done) {
    clients.splice(0).forEach((socket) => {
      socket.disconnect();
    });

    const processToStop = serverProcess;
    serverProcess = null;

    if (!processToStop || processToStop.exitCode !== null) {
      fs.rmSync(tmpDir, {recursive: true, force: true});
      done();
      return;
    }

    let finished = false;
    function finish() {
      if (finished) {
        return;
      }
      finished = true;
      fs.rmSync(tmpDir, {recursive: true, force: true});
      done();
    }

    processToStop.once('exit', finish);
    processToStop.kill('SIGTERM');
    setTimeout(() => {
      if (processToStop.exitCode === null) {
        processToStop.kill('SIGKILL');
      }
      setTimeout(finish, 1000);
    }, 1000);
  });

  it('should complete the player handshake and publish movement sync packets', async function () {
    const socket = createClient(port, 'player');
    clients.push(socket);

    await waitForSocketEvent(socket, 'connect');
    const welcomeArgs = await waitForSocketEvent(socket, 'welcome', () => socket.emit('respawn'));
    const playerSettings = welcomeArgs[0];
    const gameSizes = welcomeArgs[1];

    expect(gameSizes.width).to.be.a('number');
    socket.emit('gotit', Object.assign({}, playerSettings, {
      name: 'tester_01',
      screenWidth: 800,
      screenHeight: 600,
      target: {x: 0, y: 0},
      consentToRecord: true,
      isReplayAllowed: true
    }));

    const moveArgs = await waitForSocketEvent(socket, 'serverTellPlayerMove');
    expect(moveArgs[0]).to.include({
      id: socket.id,
      name: 'tester_01'
    });
    expect(moveArgs[1]).to.be.an('array');
    expect(moveArgs[2]).to.be.an('array');
    expect(moveArgs[5]).to.be.an('array');
    expect(moveArgs[6]).to.be.an('array');
  });

  it('should sanitize chat, persist audit logs, and record failed admin login attempts', async function () {
    const alice = createClient(port, 'player');
    const bob = createClient(port, 'player');
    clients.push(alice, bob);

    await Promise.all([
      waitForSocketEvent(alice, 'connect'),
      waitForSocketEvent(bob, 'connect')
    ]);

    const aliceWelcome = await waitForSocketEvent(alice, 'welcome', () => alice.emit('respawn'));
    const bobWelcome = await waitForSocketEvent(bob, 'welcome', () => bob.emit('respawn'));

    alice.emit('gotit', Object.assign({}, aliceWelcome[0], {
      name: 'alice_01',
      screenWidth: 800,
      screenHeight: 600,
      target: {x: 0, y: 0}
    }));
    bob.emit('gotit', Object.assign({}, bobWelcome[0], {
      name: 'bob_01',
      screenWidth: 800,
      screenHeight: 600,
      target: {x: 0, y: 0}
    }));

    await Promise.all([
      waitForSocketEvent(alice, 'serverTellPlayerMove'),
      waitForSocketEvent(bob, 'serverTellPlayerMove')
    ]);

    const chatPromise = waitForSocketEvent(bob, 'serverSendPlayerChat');
    alice.emit('playerChat', {
      sender: '<b>alice_01</b>',
      message: '<img src=x>hello socket path'
    });
    const chatArgs = await chatPromise;
    expect(chatArgs[0]).to.deep.equal({
      sender: 'alice_01',
      message: 'hello socket path'
    });

    const adminMessagePromise = waitForSocketEvent(alice, 'serverMSG');
    alice.emit('pass', ['wrong-password']);
    expect((await adminMessagePromise)[0]).to.contain('Password incorrect');

    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(readRows(serverDbPath, 'SELECT username, message FROM chat_messages')).to.deep.equal([{
      username: 'alice_01',
      message: 'hello socket path'
    }]);
    expect(readRows(serverDbPath, 'SELECT username FROM failed_login_attempts')).to.deep.equal([{
      username: 'alice_01'
    }]);
  });
});
