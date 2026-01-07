import esbuild from 'esbuild';
import { baseConfig } from '../../esbuild.base.config.js';

await esbuild.build(baseConfig);
