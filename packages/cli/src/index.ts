import { Command } from 'commander';
import { openCommand } from './commands/open.js';
import { initCommand } from './commands/init.js';
import { doctorCommand } from './commands/doctor.js';

const program = new Command();

program
  .name('eawb')
  .description('EA Workbench — repo-native enterprise architecture workbench')
  .version('0.1.0')
  .option('--debug', 'Enable verbose console output');

program
  .command('open', { isDefault: true })
  .description('Open the workbench in the current directory')
  .option('-p, --port <port>', 'Server port', '47120')
  .option('--no-browser', 'Do not open browser')
  .option('--debug', 'Enable verbose console output')
  .action((cmdOpts) => {
    const debug = cmdOpts.debug || program.opts().debug;
    return openCommand({ ...cmdOpts, debug });
  });

program
  .command('init')
  .description('Initialize a new workbench in the current directory')
  .option('-n, --name <name>', 'Workbench name')
  .option('--remote <url>', 'GitHub remote URL to attach to the new workspace')
  .option('--no-remote', 'Skip the interactive remote prompt')
  .action(initCommand);

program.command('doctor').description('Check environment prerequisites').action(doctorCommand);

program.parse();
