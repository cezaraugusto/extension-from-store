import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { downloadToFile } from './http';
import { extensionFromStoreError, type ErrorCode } from './errors';
import { createLogger, type Logger } from './logger';
import { extractCrx, extractZipArchive } from './extract';
import { readManifestInfo } from './meta';
import { getChromeDownloadUrl } from './stores/chrome';
import { getEdgeDownloadUrl } from './stores/edge';
import { resolveFirefoxDownload } from './stores/firefox';
import {
  detectStoreFromUrl,
  extractChromeIdFromUrl,
  extractEdgeIdFromUrl,
  extractFirefoxSlugFromUrl,
} from './stores/resolve-slug';

export type DownloadOptions = {
  outDir?: string;
  userAgent?: string;
  logger?: Logger;
  version?: string;
  extract?: boolean;
};

export { extensionFromStoreError } from './errors';
export type { Logger } from './logger';

type ResolvedDownload = {
  downloadUrl: string;
  archiveType: 'crx' | 'xpi';
  versionHint?: string;
  downloadId?: string;
  slugOrId: string;
};

function validateInput(url: string): void {
  if (!url || typeof url !== 'string') {
    throw new extensionFromStoreError('InvalidInput', 'URL is required');
  }
}

function defaultOutputDir(): string {
  return path.resolve(process.cwd(), 'extensions');
}

function sanitizeSegment(value: string, label: string): string {
  const sanitized = value.replace(/[\\/]/g, '-').trim();

  if (!sanitized) {
    throw new extensionFromStoreError(
      'InvalidInput',
      `${label} is not a valid path segment`,
    );
  }

  return sanitized;
}

async function ensureDirExists(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function moveDir(source: string, destination: string): Promise<void> {
  try {
    await fs.rename(source, destination);
  } catch {
    await fs.cp(source, destination, { recursive: true });
    await fs.rm(source, { recursive: true, force: true });
  }
}

async function resolveDownload(
  url: string,
  version: string | undefined,
  options: DownloadOptions,
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
      downloadUrl: getChromeDownloadUrl(downloadId),
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
  const firefox = await resolveFirefoxDownload(slug, version, options);

  return {
    downloadUrl: firefox.downloadUrl,
    archiveType: 'xpi',
    versionHint: firefox.version,
    slugOrId: firefox.slugOrId,
  };
}

function errorWithCode(code: ErrorCode, message: string, cause?: unknown) {
  return new extensionFromStoreError(code, message, cause);
}

export async function fetchExtensionFromStore(
  url: string,
  options: DownloadOptions = {},
): Promise<void> {
  validateInput(url);
  const log = createLogger(options.logger);
  const outDir = options.outDir
    ? path.resolve(options.outDir)
    : defaultOutputDir();

  await ensureDirExists(outDir);
  const resolved = await resolveDownload(url, options.version, options);

  if (options.version && !url.includes('addons.mozilla.org')) {
    log.warn(
      'Version hints are best-effort and only supported on Firefox at the moment.',
    );
  }

  const workDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'extension-from-store-'),
  );
  const archivePath = path.join(workDir, `archive.${resolved.archiveType}`);
  const extractDir = path.join(workDir, 'extracted');

  try {
    log.info(`Downloading from ${resolved.downloadUrl}`);
    await downloadToFile(resolved.downloadUrl, archivePath, {
      userAgent: options.userAgent,
      logger: options.logger,
    });

    const safeId = sanitizeSegment(resolved.slugOrId, 'Extension identifier');
    const versionSuffix = resolved.versionHint
      ? `@${sanitizeSegment(resolved.versionHint, 'Extension version')}`
      : '';

    if (options.extract !== true) {
      const archiveName = `${safeId}${versionSuffix}.${resolved.archiveType}`;
      const finalArchivePath = path.join(outDir, archiveName);
      if (await pathExists(finalArchivePath)) {
        throw errorWithCode(
          'FilesystemConflict',
          `Target file already exists: ${finalArchivePath}`,
        );
      }
      await fs.rename(archivePath, finalArchivePath);
      return;
    }

    await fs.mkdir(extractDir, { recursive: true });
    if (resolved.archiveType === 'crx') {
      await extractCrx(archivePath, extractDir, workDir);
    } else {
      await extractZipArchive(archivePath, extractDir);
    }

    const manifestPath = path.join(extractDir, 'manifest.json');
    const manifestInfo = await readManifestInfo(manifestPath);
    const resolvedVersion =
      resolved.versionHint || manifestInfo.extensionVersion;
    const safeVersion = sanitizeSegment(resolvedVersion, 'Extension version');
    const folderName = `${safeId}@${safeVersion}`;
    const finalDir = path.join(outDir, folderName);

    if (await pathExists(finalDir)) {
      throw errorWithCode(
        'FilesystemConflict',
        `Target folder already exists: ${finalDir}`,
      );
    }

    await moveDir(extractDir, finalDir);
    const metaPath = path.join(finalDir, 'extension.meta.json');
    const meta = {
      store: detectStoreFromUrl(url) || 'chrome',
      identifier: resolved.slugOrId,
      version: resolvedVersion,
      manifestVersion: manifestInfo.manifestVersion,
    };

    await fs.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  } catch (error) {
    if (error instanceof extensionFromStoreError) throw error;
    throw errorWithCode(
      'ExtractionFailed',
      'Failed to extract extension',
      error,
    );
  } finally {
    await fs
      .rm(workDir, { recursive: true, force: true })
      .catch(() => undefined);
  }
}
