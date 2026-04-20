const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.join(__dirname, '..');
const port = 9002;
const nextCli = path.join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next');
const electronCli = path.join(rootDir, 'node_modules', 'electron', 'cli.js');

function waitForPort(targetPort, timeoutMs = 120000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ port: targetPort, host: '127.0.0.1' });

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for port ${targetPort}.`));
          return;
        }
        setTimeout(attempt, 1000);
      });
    };

    attempt();
  });
}

const nextProcess = spawn(process.execPath, [nextCli, 'dev', '-p', String(port)], {
  cwd: rootDir,
  stdio: 'inherit',
});

let electronProcess = null;

waitForPort(port)
  .then(() => {
    electronProcess = spawn(process.execPath, [electronCli, '.'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        ELECTRON_START_URL: `http://127.0.0.1:${port}`,
      },
    });

    electronProcess.on('exit', (code) => {
      nextProcess.kill();
      process.exit(code ?? 0);
    });
  })
  .catch((error) => {
    console.error(error);
    nextProcess.kill();
    process.exit(1);
  });

nextProcess.on('exit', (code) => {
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }
  process.exit(code ?? 0);
});
