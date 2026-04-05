import { execSync } from 'node:child_process';

export interface CopilotDiscovery {
  available: boolean;
  path: string | null;
  method: 'cli' | 'npx' | null;
}

export function discoverCopilot(): CopilotDiscovery {
  // Try direct CLI first
  try {
    execSync('copilot --version', { stdio: 'pipe', encoding: 'utf-8' });
    return { available: true, path: 'copilot', method: 'cli' };
  } catch {
    // Not found directly
  }

  // Try GitHub Copilot language server via npx
  try {
    execSync('npx -y @github/copilot-language-server --version', { stdio: 'pipe', encoding: 'utf-8', timeout: 10_000 });
    return { available: true, path: 'npx -y @github/copilot-language-server', method: 'npx' };
  } catch {
    // Not available
  }

  return { available: false, path: null, method: null };
}
