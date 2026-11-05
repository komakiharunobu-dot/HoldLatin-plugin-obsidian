import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
mkdirSync('.test-build', { recursive: true });
await build({ entryPoints: ['src/engine.ts', 'src/variants.ts', 'src/settings.ts'], bundle: true, platform: 'node', format: 'cjs', target: 'node18', outdir: '.test-build', outExtension: { '.js': '.cjs' } });
const result = spawnSync(process.execPath, ['--test', 'tests/engine.test.cjs'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
