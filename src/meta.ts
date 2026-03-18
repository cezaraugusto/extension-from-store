import fs from 'node:fs/promises';
import { extensionFromStoreError } from './errors';
import { parseManifestInfo, type ManifestInfo } from './manifest';

export async function readManifestInfo(
  manifestPath: string,
): Promise<ManifestInfo> {
  let raw = '';
  try {
    raw = await fs.readFile(manifestPath, 'utf8');
  } catch (error) {
    throw new extensionFromStoreError(
      'ExtractionFailed',
      'manifest.json was not found after extraction',
      error,
    );
  }

  return parseManifestInfo(raw);
}
