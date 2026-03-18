import { describe, expect, test } from 'vitest';
import { parseManifestInfo } from '../src/manifest';
import { getChromeDownloadUrl } from '../src/stores/chrome';

describe('core helpers', () => {
  test('parses manifest metadata from raw text', () => {
    const manifest = parseManifestInfo(
      JSON.stringify({
        manifest_version: 3,
        version: '1.2.3',
        name: 'Example extension',
      }),
    );

    expect(manifest.manifestVersion).toBe(3);
    expect(manifest.extensionVersion).toBe('1.2.3');
    expect(manifest.manifest.name).toBe('Example extension');
  });

  test('builds a chrome download url with explicit platform info', () => {
    const url = getChromeDownloadUrl('cfhdojbkjhnklbpkdaibdccddilifddb', {
      os: 'mac',
      arch: 'arm64',
    });

    expect(url).toContain('os=mac');
    expect(url).toContain('arch=arm64');
    expect(url).toContain('id%3Dcfhdojbkjhnklbpkdaibdccddilifddb%26uc');
  });
});
