import esbuild from 'esbuild';
import fs from 'fs';

await esbuild.build({
  entryPoints: ['app.ts'],
  bundle: true,
  outfile: 'dist/app.bundle.js',
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  minify: true,
});

// Copy HTML and styles to dist
fs.copyFileSync('index.html', 'dist/index.html');
fs.copyFileSync('custom.css', 'dist/custom.css');
fs.copyFileSync('../shared/common.css', 'dist/common.css');
fs.copyFileSync('../shared/upload.svg', 'dist/upload.svg');
