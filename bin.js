#!/usr/bin/env node

const mod = require('./dist/index.cjs');
const fetchExtensionFromStore = mod.fetchExtensionFromStore;
const extensionFromStoreError = mod.extensionFromStoreError;

const EXIT_CODES = {
  InvalidInput: 1,
  UnsupportedStore: 2,
  NotFound: 3,
  NotPublic: 3,
  DownloadFailed: 4,
  ExtractionFailed: 5,
  FilesystemConflict: 6,
  StoreIncompatibility: 7,
};

function parseArgs(argv) {
  const args = [...argv];

  if (args[0] === 'fetch') args.shift();

  const result = {
    url: '',
    out: '',
    version: '',
    userAgent: '',
    extract: false,
    quiet: false,
    verbose: false,
    json: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--url') {
      result.url = args[++i] || '';
      continue;
    }

    if (arg === '--out') {
      result.out = args[++i] || '';
      continue;
    }

    if (arg === '--version') {
      result.version = args[++i] || '';
      continue;
    }
    if (arg === '--extract') {
      result.extract = true;
      continue;
    }

    if (arg === '--user-agent') {
      result.userAgent = args[++i] || '';
      continue;
    }

    if (arg === '--quiet') {
      result.quiet = true;
      continue;
    }

    if (arg === '--verbose') {
      result.verbose = true;
      continue;
    }

    if (arg === '--json') {
      result.json = true;
      continue;
    }

    throw new Error(`Unknown flag: ${arg}`);
  }

  if (!result.url) {
    throw new Error('Missing required flag: --url');
  }

  return result;
}

function createCliLogger(opts) {
  const emit = (level, message, error) => {
    const payload = { level, message };
    if (error) payload.error = String(error);
    console.log(JSON.stringify(payload));
  };

  if (opts.json) {
    return {
      onInfo: (message) => emit('info', message),
      onWarn: (message) => emit('warn', message),
      onError: (message, error) => emit('error', message, error),
    };
  }

  return {
    onInfo: opts.quiet ? undefined : (message) => console.log(message),
    onWarn: opts.quiet ? undefined : (message) => console.error(message),
    onError: (message, error) => {
      const text = error ? `${message}\n${String(error)}` : message;
      console.error(text);
    },
  };
}

async function main() {
  let args = null;

  try {
    args = parseArgs(process.argv.slice(2));
    const logger = createCliLogger(args);
    await fetchExtensionFromStore(
      args.url,
      {
        outDir: args.out || undefined,
        userAgent: args.userAgent || undefined,
        version: args.version || undefined,
        extract: args.extract,
        logger,
      },
    );
    process.exit(0);
  } catch (error) {
    if (error instanceof extensionFromStoreError) {
      const code = EXIT_CODES[error.code] || 1;
      const message = error.message || 'Extension fetch failed';

      if (args?.json) {
        console.log(JSON.stringify({ level: 'error', message }));
      } else if (code !== 0) {
        console.error(message);
      }

      process.exit(code);
    }
    const message = String(error?.message || error);

    if (args?.json) {
      console.log(JSON.stringify({ level: 'error', message }));
    } else {
      console.error(message);
    }

    process.exit(1);
  }
}

main();
