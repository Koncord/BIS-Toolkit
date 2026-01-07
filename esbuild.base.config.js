/**
 * Base esbuild configuration for all packages
 */
export const baseConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  format: 'esm',
  platform: 'neutral',
  target: 'es2020',
  sourcemap: true,
  minify: false,
};
