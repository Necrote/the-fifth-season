import { spawnSync } from 'node:child_process';
// Shell-free and cross-platform: also works in Windows PowerShell.
const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, PAGES_TEST: '1' } });
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
