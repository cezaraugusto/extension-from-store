export type Logger = {
  onInfo?: (message: string) => void;
  onWarn?: (message: string) => void;
  onError?: (message: string, error?: unknown) => void;
};

export function createLogger(logger?: Logger) {
  return {
    info: (message: string) => logger?.onInfo?.(message),
    warn: (message: string) => logger?.onWarn?.(message),
    error: (message: string, error?: unknown) =>
      logger?.onError?.(message, error),
  };
}
