import { extensionFromStoreError } from './errors';
import type { Logger } from './logger';
import type { ChromePlatformInfo } from './platform';
import { getChromeDownloadUrl } from './stores/chrome';
import { getEdgeDownloadUrl } from './stores/edge';
import { resolveFirefoxDownload, type JsonRequester } from './stores/firefox';
import {
  detectStoreFromUrl,
  extractChromeIdFromUrl,
  extractEdgeIdFromUrl,
  extractFirefoxSlugFromUrl,
} from './stores/resolve-slug';

export type ResolvedDownload = {
  store: 'chrome' | 'edge' | 'firefox';
  downloadUrl: string;
  archiveType: 'crx' | 'xpi';
  versionHint?: string;
  downloadId?: string;
  slugOrId: string;
};

export type ResolveDownloadOptions = {
  version?: string;
  userAgent?: string;
  logger?: Logger;
  platform?: ChromePlatformInfo;
  requestJson: JsonRequester;
};

export function validateInput(url: string): void {
  if (!url || typeof url !== 'string') {
    throw new extensionFromStoreError('InvalidInput', 'URL is required');
  }
}

export function sanitizeSegment(value: string, label: string): string {
  const sanitized = value.replace(/[\\/]/g, '-').trim();

  if (!sanitized) {
    throw new extensionFromStoreError(
      'InvalidInput',
      `${label} is not a valid path segment`,
    );
  }

  return sanitized;
}

export async function resolveDownload(
  url: string,
  options: ResolveDownloadOptions,
): Promise<ResolvedDownload> {
  const store = detectStoreFromUrl(url);

  if (!store) {
    throw new extensionFromStoreError(
      'UnsupportedStore',
      'URL does not match a supported store',
    );
  }

  if (store === 'chrome') {
    const downloadId = extractChromeIdFromUrl(url);

    if (!downloadId) {
      throw new extensionFromStoreError(
        'NotFound',
        'Chrome extension id not found in URL',
      );
    }

    return {
      store,
      downloadUrl: getChromeDownloadUrl(downloadId, options.platform),
      archiveType: 'crx',
      downloadId,
      slugOrId: downloadId,
    };
  }

  if (store === 'edge') {
    const downloadId = extractEdgeIdFromUrl(url);

    if (!downloadId) {
      throw new extensionFromStoreError(
        'NotFound',
        'Edge extension id not found in URL',
      );
    }

    return {
      store,
      downloadUrl: getEdgeDownloadUrl(downloadId),
      archiveType: 'crx',
      downloadId,
      slugOrId: downloadId,
    };
  }

  const slug = extractFirefoxSlugFromUrl(url);

  if (!slug) {
    throw new extensionFromStoreError(
      'NotFound',
      'Firefox extension slug not found in URL',
    );
  }

  const firefox = await resolveFirefoxDownload(slug, options.version, {
    userAgent: options.userAgent,
    logger: options.logger,
    requestJson: options.requestJson,
  });

  return {
    store,
    downloadUrl: firefox.downloadUrl,
    archiveType: 'xpi',
    versionHint: firefox.version,
    slugOrId: firefox.slugOrId,
  };
}
