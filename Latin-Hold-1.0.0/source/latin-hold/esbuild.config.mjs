import { build } from 'esbuild';
await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2020',
  outfile: 'main.js',
  external: ['obsidian', '@codemirror/state', '@codemirror/view'],
  banner: { js: '/* Latin Hold v1.0.0 | MIT | komaki | Built from src/main.ts */' },
  logLevel: 'info'
});
