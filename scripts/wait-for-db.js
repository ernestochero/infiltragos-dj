/* eslint-disable @typescript-eslint/no-require-imports */
const net = require('net');

const url = new URL(process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/app_db');
const host = url.hostname;
const port = Number(url.port) || 5432;

function check() {
  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
  });
}

(async () => {
  for (let i = 0; i < 20; i++) {
    const ok = await check();
    if (ok) {
      console.log('Database is ready');
      return;
    }
    console.log('Waiting for database...');
    await new Promise(r => setTimeout(r, 3000));
  }
  console.error('Database not reachable');
  process.exit(1);
})();
