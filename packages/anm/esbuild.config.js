import { build } from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    outfile: 'dist/index.js',
    format: 'esm',
    platform: 'node',
    target: 'es2020',
    sourcemap: true,
    external: Object.keys(pkg.dependencies || {}),
}).catch(() => process.exit(1));
