import * as path from 'node:path';
import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: {
    entry: {
      index: path.resolve(__dirname, './src/index.ts'),
      browser: path.resolve(__dirname, './src/browser.ts'),
      core: path.resolve(__dirname, './src/core.ts'),
    },
  },
  lib: [
    {
      format: 'esm',
      syntax: 'es2021',
      dts: true,
    },
    {
      format: 'cjs',
      syntax: 'es2021',
    },
  ],
});
