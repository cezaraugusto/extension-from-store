export {
  extensionFromStoreError,
  asExtensionFromStoreError,
  type ErrorCode,
} from './errors';
export { createLogger, type Logger } from './logger';
export {
  parseManifestInfo,
  type ExtensionManifest,
  type ManifestInfo,
} from './manifest';
export {
  normalizeChromePlatformInfo,
  type ChromePlatformArch,
  type ChromePlatformInfo,
  type ChromePlatformOs,
} from './platform';
export {
  resolveDownload,
  sanitizeSegment,
  validateInput,
  type ResolveDownloadOptions,
  type ResolvedDownload,
} from './resolve';
export { stripCrxHeader } from './crx';
export { getChromeDownloadUrl } from './stores/chrome';
export { getEdgeDownloadUrl } from './stores/edge';
export { resolveFirefoxDownload, type JsonRequester } from './stores/firefox';
export {
  detectStoreFromUrl,
  extractChromeIdFromUrl,
  extractEdgeIdFromUrl,
  extractFirefoxSlugFromUrl,
  type StoreFromUrl,
} from './stores/resolve-slug';
