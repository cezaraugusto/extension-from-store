import { describe, expect, test } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fetchExtensionFromStore } from '../src/index';

const runLive = process.env.RUN_LIVE_FETCH === '1';

describe('live fetch (adblock plus)', () => {
  const run = runLive ? test : test.skip;

  run(
    'fetches from Chrome, Edge, and Firefox using URLs',
    { timeout: 120_000 },
    async () => {
      const outDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'extension-from-store-live-'),
      );

      try {
        await fetchExtensionFromStore(
          'https://chromewebstore.google.com/detail/adblock-plus-free-ad-bloc/cfhdojbkjhnklbpkdaibdccddilifddb?hl=pt-BR',
          { outDir, userAgent: 'extension-from-store-ci', extract: true },
        );

        await fetchExtensionFromStore(
          'https://microsoftedge.microsoft.com/addons/detail/adblock-plus-free-ad-bl/gmgoamodcdcjnbaobigkjelfplakmdhh',
          { outDir, userAgent: 'extension-from-store-ci', extract: true },
        );

        await fetchExtensionFromStore(
          'https://addons.mozilla.org/en-US/firefox/addon/adblock-plus/',
          { outDir, userAgent: 'extension-from-store-ci', extract: true },
        );

        const entries = await fs.readdir(outDir);
        expect(entries.length).toBe(3);

        for (const entry of entries) {
          const metaPath = path.join(outDir, entry, 'extension.meta.json');
          const content = await fs.readFile(metaPath, 'utf8');

          expect(content.length).toBeGreaterThan(10);
        }
      } finally {
        await fs.rm(outDir, { recursive: true, force: true });
      }
    },
  );
});
