import { initializeWorkbench, isWorkbenchInitialized } from '@ea-workbench/runtime';

export async function initCommand(opts: { name?: string }): Promise<void> {
  const cwd = process.cwd();

  if (isWorkbenchInitialized(cwd)) {
    console.log('  EA Workbench is already initialized in this directory.');
    return;
  }

  console.log('  Initializing EA Workbench...\n');

  try {
    const config = await initializeWorkbench(cwd, opts.name);
    console.log(`  Workbench "${config.name}" initialized successfully.`);
    console.log(`  Run 'eawb open' to start the workbench.\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`  Failed to initialize: ${message}`);
    process.exit(1);
  }
}
