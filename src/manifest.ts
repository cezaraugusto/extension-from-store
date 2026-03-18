import { extensionFromStoreError } from './errors';

export type ExtensionManifest = Record<string, unknown>;

export type ManifestInfo = {
  extensionVersion: string;
  manifestVersion: 2 | 3;
  manifest: ExtensionManifest;
};

export function parseManifestInfo(raw: string): ManifestInfo {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new extensionFromStoreError(
      'ExtractionFailed',
      'manifest.json is not valid JSON',
      error,
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new extensionFromStoreError(
      'ExtractionFailed',
      'manifest.json must contain an object',
    );
  }

  const manifest = parsed as ExtensionManifest;
  const manifestVersion = manifest.manifest_version;
  const extensionVersion = manifest.version;

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

  return {
    manifest,
    manifestVersion,
    extensionVersion,
  };
}
