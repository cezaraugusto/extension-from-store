import fs from 'node:fs/promises';
import { extensionFromStoreError } from './errors';

export type ManifestInfo = {
  extensionVersion: string;
  manifestVersion: 2 | 3;
};

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

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new extensionFromStoreError(
      'ExtractionFailed',
      'manifest.json is not valid JSON',
      error,
    );
  }

  const manifestVersion = parsed?.manifest_version;
  const extensionVersion = parsed?.version;
  if (manifestVersion !== 2 && manifestVersion !== 3) {
    throw new extensionFromStoreError(
      'ExtractionFailed',
      'manifest_version must be 2 or 3',
    );
  }
  if (!extensionVersion || typeof extensionVersion !== 'string') {
    throw new extensionFromStoreError(
      'ExtractionFailed',
      'manifest.json is missing a version',
    );
  }

  return { manifestVersion, extensionVersion };
}
