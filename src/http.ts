import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { pipeline } from 'node:stream/promises';
import { URL } from 'node:url';
import { extensionFromStoreError } from './errors';
import { createLogger, type Logger } from './logger';

type HttpOptions = {
  userAgent?: string;
  logger?: Logger;
};

type RequestOptions = HttpOptions & {
  method?: 'GET' | 'HEAD';
};

const DEFAULT_USER_AGENT = 'extension-from-store';

function request(
  url: string,
  options: RequestOptions,
): Promise<{
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  stream: any;
}> {
  const target = new URL(url);
  const client = target.protocol === 'http:' ? http : https;
  const headers: Record<string, string> = {
    'user-agent': options.userAgent || DEFAULT_USER_AGENT,
  };

  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        method: options.method || 'GET',
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        headers,
      },
      (res) => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          stream: res,
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

function resolveRedirectUrl(base: string, location: string): string {
  return new URL(location, base).toString();
}

export async function resolveFinalUrl(
  url: string,
  options: HttpOptions,
  maxRedirects = 5,
): Promise<string> {
  const { statusCode, headers, stream } = await request(url, {
    ...options,
    method: 'HEAD',
  });

  if (statusCode === 405) {
    stream.resume();
    return resolveFinalUrlWithGet(url, options, maxRedirects);
  }

  if (
    statusCode >= 300 &&
    statusCode < 400 &&
    typeof headers.location === 'string'
  ) {
    stream.resume();

    if (maxRedirects <= 0) {
      throw new extensionFromStoreError(
        'DownloadFailed',
        `Too many redirects while resolving ${url}`,
      );
    }

    const next = resolveRedirectUrl(url, headers.location);
    return resolveFinalUrl(next, options, maxRedirects - 1);
  }

  stream.resume();
  return url;
}

async function resolveFinalUrlWithGet(
  url: string,
  options: HttpOptions,
  maxRedirects: number,
): Promise<string> {
  const { statusCode, headers, stream } = await request(url, options);

  if (
    statusCode >= 300 &&
    statusCode < 400 &&
    typeof headers.location === 'string'
  ) {
    stream.resume();

    if (maxRedirects <= 0) {
      throw new extensionFromStoreError(
        'DownloadFailed',
        `Too many redirects while resolving ${url}`,
      );
    }

    const next = resolveRedirectUrl(url, headers.location);
    return resolveFinalUrlWithGet(next, options, maxRedirects - 1);
  }

  stream.resume();
  return url;
}

export async function downloadToFile(
  url: string,
  filePath: string,
  options: HttpOptions,
  maxRedirects = 5,
): Promise<void> {
  const log = createLogger(options.logger);
  const { statusCode, headers, stream } = await request(url, options);

  if (
    statusCode >= 300 &&
    statusCode < 400 &&
    typeof headers.location === 'string'
  ) {
    if (maxRedirects <= 0) {
      throw new extensionFromStoreError(
        'DownloadFailed',
        `Too many redirects while downloading ${url}`,
      );
    }

    const next = resolveRedirectUrl(url, headers.location);
    log.info(`Redirecting to ${next}`);

    return downloadToFile(next, filePath, options, maxRedirects - 1);
  }

  if (statusCode < 200 || statusCode >= 300) {
    if (statusCode === 404) {
      throw new extensionFromStoreError(
        'NotFound',
        `Extension not found at ${url}`,
      );
    }

    if (statusCode === 401 || statusCode === 403) {
      throw new extensionFromStoreError(
        'NotPublic',
        `Extension is not publicly downloadable`,
      );
    }

    throw new extensionFromStoreError(
      'DownloadFailed',
      `Failed to download ${url} (HTTP ${statusCode})`,
    );
  }

  await pipeline(stream, fs.createWriteStream(filePath));
}

export async function requestJson<T>(
  url: string,
  options: HttpOptions,
  maxRedirects = 5,
): Promise<T> {
  const { statusCode, headers, stream } = await request(url, options);

  if (
    statusCode >= 300 &&
    statusCode < 400 &&
    typeof headers.location === 'string'
  ) {
    if (maxRedirects <= 0) {
      throw new extensionFromStoreError(
        'DownloadFailed',
        `Too many redirects while requesting ${url}`,
      );
    }

    const next = resolveRedirectUrl(url, headers.location);

    return requestJson<T>(next, options, maxRedirects - 1);
  }

  if (statusCode < 200 || statusCode >= 300) {
    if (statusCode === 404) {
      throw new extensionFromStoreError(
        'NotFound',
        `Extension not found at ${url}`,
      );
    }

    throw new extensionFromStoreError(
      'DownloadFailed',
      `Failed to request ${url} (HTTP ${statusCode})`,
    );
  }

  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString('utf8');

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

export async function requestText(
  url: string,
  options: HttpOptions,
  maxRedirects = 5,
): Promise<string> {
  const { statusCode, headers, stream } = await request(url, options);

  if (
    statusCode >= 300 &&
    statusCode < 400 &&
    typeof headers.location === 'string'
  ) {
    if (maxRedirects <= 0) {
      throw new extensionFromStoreError(
        'DownloadFailed',
        `Too many redirects while requesting ${url}`,
      );
    }

    const next = resolveRedirectUrl(url, headers.location);

    return requestText(next, options, maxRedirects - 1);
  }

  if (statusCode < 200 || statusCode >= 300) {
    if (statusCode === 404) {
      throw new extensionFromStoreError(
        'NotFound',
        `Extension not found at ${url}`,
      );
    }

    throw new extensionFromStoreError(
      'DownloadFailed',
      `Failed to request ${url} (HTTP ${statusCode})`,
    );
  }

  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}
