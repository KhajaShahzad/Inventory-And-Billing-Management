const { spawn } = require('child_process');

const CLOUDFLARE_URL_PATTERN = /(https:\/\/[a-z0-9-]+\.trycloudflare\.com)/i;
const LOCAL_FRONTEND_URL = process.env.SCANNER_TUNNEL_TARGET || 'http://127.0.0.1:5173';

let tunnelProcess = null;
let tunnelUrl = '';
let startingPromise = null;

const readTunnelUrlFromChunk = (chunk) => {
  const match = `${chunk || ''}`.match(CLOUDFLARE_URL_PATTERN);
  return match?.[1] || '';
};

const clearTunnelState = () => {
  tunnelProcess = null;
  tunnelUrl = '';
  startingPromise = null;
};

const attachListeners = (child, resolve, reject) => {
  let settled = false;

  const handleOutput = (chunk) => {
    const discoveredUrl = readTunnelUrlFromChunk(chunk);
    if (!discoveredUrl) {
      return;
    }

    tunnelUrl = discoveredUrl;
    if (!settled) {
      settled = true;
      resolve(discoveredUrl);
    }
  };

  child.stdout?.on('data', handleOutput);
  child.stderr?.on('data', handleOutput);

  child.on('error', (error) => {
    if (!settled) {
      settled = true;
      reject(error);
    }
    clearTunnelState();
  });

  child.on('exit', () => {
    if (!settled) {
      settled = true;
      reject(new Error('cloudflared exited before an HTTPS URL was created'));
    }
    clearTunnelState();
  });
};

const ensureScannerTunnel = async () => {
  if (tunnelUrl) {
    return tunnelUrl;
  }

  if (startingPromise) {
    return startingPromise;
  }

  startingPromise = new Promise((resolve, reject) => {
    const child = spawn('cloudflared', ['tunnel', '--url', LOCAL_FRONTEND_URL], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    tunnelProcess = child;
    attachListeners(child, resolve, reject);

    setTimeout(() => {
      if (tunnelUrl) {
        resolve(tunnelUrl);
        return;
      }

      if (tunnelProcess === child) {
        child.kill();
      }
      reject(new Error('Timed out while starting secure scanner tunnel'));
      clearTunnelState();
    }, 15000);
  }).finally(() => {
    startingPromise = null;
  });

  return startingPromise;
};

const getScannerTunnelUrl = () => tunnelUrl;

const stopScannerTunnel = () => {
  if (tunnelProcess) {
    tunnelProcess.kill();
  }
  clearTunnelState();
};

process.on('exit', stopScannerTunnel);
process.on('SIGINT', () => {
  stopScannerTunnel();
  process.exit(0);
});
process.on('SIGTERM', () => {
  stopScannerTunnel();
  process.exit(0);
});

module.exports = {
  ensureScannerTunnel,
  getScannerTunnelUrl,
};
