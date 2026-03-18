import { describe, expect, test } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { fetchExtensionFromStoreBrowser, type FetchLike } from '../src/browser';

function buildCrx2(payload: Uint8Array): Uint8Array {
  const publicKey = strToU8('ABCD');
  const signature = strToU8('EF');
  const header = new Uint8Array(16);
  const view = new DataView(header.buffer);

  header.set(strToU8('Cr24'), 0);
  view.setUint32(4, 2, true);
  view.setUint32(8, publicKey.length, true);
  view.setUint32(12, signature.length, true);

  const crx = new Uint8Array(
    header.length + publicKey.length + signature.length + payload.length,
  );

  crx.set(header, 0);
  crx.set(publicKey, header.length);
  crx.set(signature, header.length + publicKey.length);
  crx.set(payload, header.length + publicKey.length + signature.length);
  return crx;
}

describe('fetchExtensionFromStoreBrowser', () => {
  test('downloads, extracts, and returns browser-friendly file data', async () => {
    const zipBytes = zipSync({
      'manifest.json': strToU8(
        JSON.stringify({
          manifest_version: 3,
          version: '9.9.9',
          name: 'Browser test extension',
        }),
      ),
      'src/background.js': strToU8('console.log("hello")'),
      'images/icon.png': new Uint8Array([137, 80, 78, 71]),
    });

    const archiveBytes = buildCrx2(zipBytes);

    const fetchImpl: FetchLike = async () => ({
      ok: true,
      status: 200,
      url: 'https://clients2.google.com/service/update2/crx?response=redirect',
      async arrayBuffer() {
        return archiveBytes.buffer.slice(
          archiveBytes.byteOffset,
          archiveBytes.byteOffset + archiveBytes.byteLength,
        );
      },
      async text() {
        return '';
      },
    });

    const result = await fetchExtensionFromStoreBrowser(
      'https://chromewebstore.google.com/detail/example/cfhdojbkjhnklbpkdaibdccddilifddb',
      {
        fetch: fetchImpl,
        platform: { os: 'linux', arch: 'x64' },
      },
    );

    expect(result.store).toBe('chrome');
    expect(result.version).toBe('9.9.9');
    expect(result.manifest.name).toBe('Browser test extension');
    expect(
      result.files.find((file) => file.path === 'src/background.js')?.text,
    ).toBe('console.log("hello")');
    expect(
      result.files.find((file) => file.path === 'images/icon.png')?.text,
    ).toBeUndefined();
  });
});
