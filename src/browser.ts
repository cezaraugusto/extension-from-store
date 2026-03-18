import { strFromU8, unzipSync } from 'fflate';
import { stripCrxHeader } from './crx';
import { extensionFromStoreError } from './errors';
import { createLogger, type Logger } from './logger';
import { parseManifestInfo, type ExtensionManifest } from './manifest';
import type { ChromePlatformInfo } from './platform';
import { resolveDownload, validateInput } from './resolve';

type FetchLikeResponse = {
  ok: boolean;
  status: number;
  url?: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
};

export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<FetchLikeResponse>;

export type BrowserExtensionFile = {
  path: string;
  bytes: Uint8Array;
  text?: string;
};

export type BrowserFetchOptions = {
  version?: string;
  userAgent?: string;
  logger?: Logger;
  platform?: ChromePlatformInfo;
  fetch?: FetchLike;
};

export type BrowserFetchResult = {
  store: 'chrome' | 'edge' | 'firefox';
  identifier: string;
  version: string;
  manifestVersion: 2 | 3;
  archiveType: 'crx' | 'xpi';
  downloadUrl: string;
  archiveBytes: Uint8Array;
  manifest: ExtensionManifest;
  files: BrowserExtensionFile[];
  meta: {
    store: 'chrome' | 'edge' | 'firefox';
    identifier: string;
    version: string;
    manifestVersion: 2 | 3;
  };
};

const TEXT_FILE_PATTERN =
  /(^|\/)(?:[^/]+\.(?:txt|md|mdx|json|js|jsx|mjs|cjs|ts|tsx|css|scss|sass|less|html|xml|svg|yml|yaml|toml|ini|conf|map)|\.(?:gitignore|npmrc|editorconfig|prettierrc|eslintrc))$/i;

function getDefaultFetch(): FetchLike {
  if (typeof globalThis.fetch !== 'function') {
    throw new extensionFromStoreError(
      'DownloadFailed',
      'No fetch implementation was provided',
    );
  }

  return globalThis.fetch.bind(globalThis) as FetchLike;
}

function inferBrowserChromePlatformInfo(): ChromePlatformInfo {
  const navigatorLike = globalThis.navigator;
  const fingerprint = [
    navigatorLike?.platform,
    navigatorLike?.userAgent,
    (navigatorLike as Navigator & { userAgentData?: { platform?: string } })
      ?.userAgentData?.platform,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const os = fingerprint.includes('mac')
    ? 'mac'
    : fingerprint.includes('win')
      ? 'win'
      : 'linux';

  const arch =
    fingerprint.includes('arm') || fingerprint.includes('aarch64')
      ? 'arm64'
      : fingerprint.includes('i686') ||
          fingerprint.includes('i386') ||
          (fingerprint.includes('x86') && !fingerprint.includes('x86_64'))
        ? 'x86'
        : 'x64';

  return { os, arch };
}

function isLikelyTextFile(path: string): boolean {
  return path === 'manifest.json' || TEXT_FILE_PATTERN.test(path);
}

function decodeText(bytes: Uint8Array): string {
  return strFromU8(bytes);
}

function mapHttpError(url: string, status: number): extensionFromStoreError {
  if (status === 404) {
    return new extensionFromStoreError(
      'NotFound',
      `Extension not found at ${url}`,
    );
  }

  if (status === 401 || status === 403) {
    return new extensionFromStoreError(
      'NotPublic',
      'Extension is not publicly downloadable',
    );
  }

  return new extensionFromStoreError(
    'DownloadFailed',
    `Failed to request ${url} (HTTP ${status})`,
  );
}

async function requestJsonWithFetch<T>(
  url: string,
  options: {
    userAgent?: string;
    logger?: Logger;
    fetchImpl: FetchLike;
  },
): Promise<T> {
  if (options.userAgent) {
    createLogger(options.logger).warn(
      'Custom user agents are ignored in browser environments.',
    );
  }

  const response = await options.fetchImpl(url);

  if (!response.ok) {
    throw mapHttpError(url, response.status);
  }

  const body = await response.text();

  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new extensionFromStoreError(
      'StoreIncompatibility',
      `Invalid JSON response from ${url}`,
      error,
    );
  }
}

async function downloadBytes(
  url: string,
  options: {
    fetchImpl: FetchLike;
    userAgent?: string;
    logger?: Logger;
  },
): Promise<{ finalUrl: string; bytes: Uint8Array }> {
  if (options.userAgent) {
    createLogger(options.logger).warn(
      'Custom user agents are ignored in browser environments.',
    );
  }

  const response = await options.fetchImpl(url);

  if (!response.ok) {
    throw mapHttpError(url, response.status);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    finalUrl: response.url || url,
    bytes,
  };
}

function buildBrowserFiles(
  entries: Record<string, Uint8Array>,
): BrowserExtensionFile[] {
  return Object.entries(entries)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, bytes]) => ({
      path,
      bytes,
      text: isLikelyTextFile(path) ? decodeText(bytes) : undefined,
    }));
}

export async function fetchExtensionFromStoreBrowser(
  url: string,
  options: BrowserFetchOptions = {},
): Promise<BrowserFetchResult> {
  validateInput(url);

  const fetchImpl = options.fetch || getDefaultFetch();
  const resolved = await resolveDownload(url, {
    version: options.version,
    userAgent: options.userAgent,
    logger: options.logger,
    platform: options.platform || inferBrowserChromePlatformInfo(),
    requestJson: (requestUrl, requestOptions) =>
      requestJsonWithFetch(requestUrl, {
        ...requestOptions,
        fetchImpl,
      }),
  });

  const archive = await downloadBytes(resolved.downloadUrl, {
    fetchImpl,
    userAgent: options.userAgent,
    logger: options.logger,
  });

  const zipPayload =
    resolved.archiveType === 'crx'
      ? stripCrxHeader(archive.bytes)
      : archive.bytes;

  let filesByPath: Record<string, Uint8Array>;
  try {
    filesByPath = unzipSync(zipPayload);
  } catch (error) {
    throw new extensionFromStoreError(
      'ExtractionFailed',
      'Failed to extract extension archive',
      error,
    );
  }

  const manifestBytes = filesByPath['manifest.json'];
  if (!manifestBytes) {
    throw new extensionFromStoreError(
      'ExtractionFailed',
      'manifest.json was not found after extraction',
    );
  }

  const manifestInfo = parseManifestInfo(decodeText(manifestBytes));
  const version = resolved.versionHint || manifestInfo.extensionVersion;
  const files = buildBrowserFiles(filesByPath);

  return {
    store: resolved.store,
    identifier: resolved.slugOrId,
    version,
    manifestVersion: manifestInfo.manifestVersion,
    archiveType: resolved.archiveType,
    downloadUrl: archive.finalUrl,
    archiveBytes: archive.bytes,
    manifest: manifestInfo.manifest,
    files,
    meta: {
      store: resolved.store,
      identifier: resolved.slugOrId,
      version,
      manifestVersion: manifestInfo.manifestVersion,
    },
  };
}
