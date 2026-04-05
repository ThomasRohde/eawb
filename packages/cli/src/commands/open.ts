import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isWorkbenchInitialized } from '@ea-workbench/runtime';
import { startupFlow } from '../startup-flow.js';

function resolveShellUiDist(): string {
  const cliDir = path.dirname(fileURLToPath(import.meta.url));

  // 1. Bundled with CLI (npm global install): dist/public/
  const bundled = path.resolve(cliDir, 'public');
  if (fs.existsSync(path.join(bundled, 'index.html'))) return bundled;

  // 2. Monorepo development: ../shell-ui/dist/ (relative to packages/cli/dist/)
  const monorepo = path.resolve(cliDir, '../../shell-ui/dist');
  if (fs.existsSync(path.join(monorepo, 'index.html'))) return monorepo;

  // 3. Resolve via node_modules
  try {
    const shellUiPkg = path.dirname(
      require.resolve('@ea-workbench/shell-ui/package.json', { paths: [cliDir] }),
    );
    const fromPkg = path.join(shellUiPkg, 'dist');
    if (fs.existsSync(path.join(fromPkg, 'index.html'))) return fromPkg;
  } catch {
    // Not found via require.resolve
  }

  throw new Error(
    'Could not find shell-ui assets. Run "npm run build" in the ea-workbench root first.',
  );
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (port < startPort + 100) {
    if (await isPortAvailable(port)) return port;
    port++;
  }
  throw new Error(`No available port found in range ${startPort}-${startPort + 99}`);
}

export async function openCommand(opts: {
  port: string;
  browser: boolean;
  debug?: boolean;
}): Promise<void> {
  const cwd = process.cwd();
  const preferredPort = parseInt(opts.port, 10);

  // If not initialized, run the startup flow
  if (!isWorkbenchInitialized(cwd)) {
    const proceed = await startupFlow(cwd);
    if (!proceed) {
      process.exit(0);
    }
  }

  const shellUiDistPath = resolveShellUiDist();

  // Find available port
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort && opts.debug) {
    console.log(`  Port ${preferredPort} in use, using ${port} instead.`);
  }

  // Start server
  const { startServer } = await import('@ea-workbench/runtime');

  if (opts.debug) {
    console.log(`\n  EA Workbench starting...`);
    console.log(`  Workspace: ${cwd}\n`);
  }

  const address = await startServer({
    port,
    host: '127.0.0.1',
    workspacePath: cwd,
    shellUiDistPath,
    silent: !opts.debug,
  });

  if (opts.debug) {
    console.log(`  Server running at ${address}`);
    console.log(`  Press Ctrl+C to stop\n`);
  }

  if (opts.browser) {
    const open = (await import('open')).default;
    await open(address);
  }
}
