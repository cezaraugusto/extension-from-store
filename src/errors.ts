export type ErrorCode =
  | 'InvalidInput'
  | 'UnsupportedStore'
  | 'NotFound'
  | 'NotPublic'
  | 'DownloadFailed'
  | 'ExtractionFailed'
  | 'FilesystemConflict'
  | 'StoreIncompatibility';

export class extensionFromStoreError extends Error {
  readonly code: ErrorCode;
  readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}

export function asExtensionFromStoreError(
  error: unknown,
  fallback: extensionFromStoreError,
): extensionFromStoreError {
  if (error instanceof extensionFromStoreError) return error;

  return new extensionFromStoreError(fallback.code, fallback.message, error);
}
