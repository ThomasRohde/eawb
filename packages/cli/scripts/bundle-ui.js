// Copy shell-ui dist into cli/dist/public so it's bundled with the CLI package
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, '../../shell-ui/dist');
const dest = path.resolve(__dirname, '../dist/public');

if (!fs.existsSync(src)) {
  console.error('shell-ui dist not found. Build shell-ui first.');
  process.exit(1);
}

// Remove existing public dir
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true });
}

// Copy recursively
fs.cpSync(src, dest, { recursive: true });
console.log(`Bundled shell-ui assets into ${dest}`);
