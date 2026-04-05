import { select } from '@inquirer/prompts';
import { initializeWorkbench } from '@ea-workbench/runtime';

export async function startupFlow(cwd: string): Promise<boolean> {
  console.log('\n  EA Workbench is not initialized in this directory.\n');

  const action = await select({
    message: 'What would you like to do?',
    choices: [
      {
        name: 'Initialize here — set up this directory as a new EA Workbench',
        value: 'init',
      },
      {
        name: 'Open existing — browse for an existing workbench repository',
        value: 'open-existing',
      },
      {
        name: 'Fork a workbench — clone an existing workbench into this directory',
        value: 'fork',
      },
      {
        name: 'Cancel',
        value: 'cancel',
      },
    ],
  });

  switch (action) {
    case 'init': {
      console.log('\n  Initializing EA Workbench...\n');
      const config = await initializeWorkbench(cwd);
      console.log(`  Workbench "${config.name}" initialized.\n`);
      return true;
    }
    case 'open-existing': {
      console.log('\n  Browse for an existing workbench is not yet implemented.');
      console.log('  Navigate to a workbench directory and run "eawb open".\n');
      return false;
    }
    case 'fork': {
      console.log('\n  Fork a workbench is not yet implemented.');
      console.log('  Clone the repo manually and run "eawb open" inside it.\n');
      return false;
    }
    default:
      return false;
  }
}
