import { requestJson } from '../http';
import { extensionFromStoreError } from '../errors';
import type { Logger } from '../logger';

type FirefoxAddon = {
  slug?: string;
  current_version?: {
    version?: string;
    file?: { url?: string };
  };
};

type FirefoxVersion = {
  version?: string;
  file?: { url?: string };
};

export async function resolveFirefoxDownload(
  idOrSlug: string,
  versionHint: string | undefined,
  options: { userAgent?: string; logger?: Logger },
): Promise<{ downloadUrl: string; version: string; slugOrId: string }> {
  const baseUrl = `https://addons.mozilla.org/api/v5/addons/addon/${encodeURIComponent(
    idOrSlug,
  )}/`;

  const addon = await requestJson<FirefoxAddon>(baseUrl, options);
  const slugOrId = addon.slug || idOrSlug;

  if (versionHint) {
    const versionUrl = `${baseUrl}versions/${encodeURIComponent(versionHint)}/`;
    const version = await requestJson<FirefoxVersion>(versionUrl, options);
    const downloadUrl = version.file?.url;

    if (!downloadUrl) {
      throw new extensionFromStoreError(
        'NotPublic',
        `Version ${versionHint} is not publicly downloadable`,
      );
    }

    return {
      downloadUrl,
      version: version.version || versionHint,
      slugOrId,
    };
  }

  const downloadUrl = addon.current_version?.file?.url;
  const version = addon.current_version?.version;

  if (!downloadUrl || !version) {
    throw new extensionFromStoreError(
      'NotPublic',
      'Extension is not publicly downloadable',
    );
  }

  return { downloadUrl, version, slugOrId };
}
