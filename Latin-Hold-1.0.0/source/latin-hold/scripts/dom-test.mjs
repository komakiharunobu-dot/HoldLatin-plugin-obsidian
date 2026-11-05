import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
mkdirSync('.test-build', { recursive: true });
await build({ entryPoints: ['tests/dom.test.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: '.test-build/dom.test.cjs', external: ['jsdom'], target: 'node18' });
const result = spawnSync(process.execPath, ['--test', '.test-build/dom.test.cjs'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
