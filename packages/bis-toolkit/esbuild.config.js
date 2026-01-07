import * as esbuild from 'esbuild';
import { baseConfig } from '../../esbuild.base.config.js';

await esbuild.build({
  ...baseConfig,
  external: [
    '@bis-toolkit/bcn',
    '@bis-toolkit/cppparser',
    '@bis-toolkit/edds',
    '@bis-toolkit/p3d',
    '@bis-toolkit/paa',
    '@bis-toolkit/utils'
  ]
});
