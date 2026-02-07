[npm-version-image]: https://img.shields.io/npm/v/extension-from-store.svg?color=0078D7
[npm-version-url]: https://www.npmjs.com/package/extension-from-store
[npm-downloads-image]: https://img.shields.io/npm/dm/extension-from-store.svg?color=2ecc40
[npm-downloads-url]: https://www.npmjs.com/package/extension-from-store
[action-image]: https://github.com/cezaraugusto/extension-from-store/actions/workflows/ci.yml/badge.svg?branch=main
[action-url]: https://github.com/cezaraugusto/extension-from-store/actions

> Download public browser extensions from official stores

# extension-from-store [![Version][npm-version-image]][npm-version-url] [![Downloads][npm-downloads-image]][npm-downloads-url] [![workflow][action-image]][action-url]

- Chrome Web Store, Microsoft Edge Add-ons, Firefox AMO
- Easy-to-use API
- Node.js + CLI support

## Install

```bash
npm i extension-from-store
```

## Usage

Designed for quiet reliability, extension-from-store keeps the interface simple and the output predictable.

**Via Node.js:**

```ts
import {fetchExtensionFromStore} from 'extension-from-store'

const url =
  'https://chromewebstore.google.com/detail/adblock-plus-free-ad-bloc/cfhdojbkjhnklbpkdaibdccddilifddb'

const options = {
  outDir: './extensions',
  userAgent: 'my-tool/1.0.0',
  extract: true,
  logger: {
    onInfo: (message) => console.log(message),
    onWarn: (message) => console.warn(message),
    onError: (message, error) => console.error(message, error)
  }
}

await fetchExtensionFromStore(url, options)
```

**Via CLI (default command is `fetch`):**

```bash
npx extension-from-store --url "<store-item-url>"
npx extension-from-store --url "<store-item-url>" --out ./my-exts
npx extension-from-store --url "<store-item-url>" --version 2.1.0 --extract
npx extension-from-store --url "<store-item-url>" --extract
```

The store is detected from the URL.

## Output

```
<out>/
  <identifier>@<resolved-version>/
    extension.meta.json
    ...
```

If the target folder already exists, the operation fails.

By default, extension-from-store downloads the archive without extraction. When you pass `--extract`, it unpacks the archive and writes metadata.

When extraction is disabled, the archive is saved as:

```
<out>/<identifier>[@<version>].crx
<out>/<identifier>[@<version>].xpi
```

## Extraction Rules

- `.crx`: strip CRX header, extract ZIP payload
- `.xpi`: treat as ZIP
- No normalization, no rewriting, no formatting

## `extension.meta.json`

```json
{
  "store": "chrome | edge | firefox",
  "identifier": "<identifier derived from the URL>",
  "version": "<resolved version>",
  "manifestVersion": 2 | 3
}
```

This file is written by extension-from-store to the same folder as the extracted files.

## CLI Flags

| Flag | Required | Description |
| --- | --- | --- |
| `--url <string>` | Yes | Extension URL |
| `--out <path>` | No | Output directory (default: `./extensions`) |
| `--version <string>` | No | Version hint |
| `--user-agent <string>` | No | Override user agent |
| `--extract` | No | Extract after download (default: download only) |
| `--quiet` | No | Suppress info logs |
| `--verbose` | No | Emit verbose info logs |
| `--json` | No | JSON lines output to stdout |


## Logging

Library logging is opt-in via the `logger` hooks. The library never writes directly to stdout/stderr.

## Exit Codes

- `0` success
- `1` invalid input
- `2` unsupported store
- `3` not found / not public
- `4` download failed
- `5` extraction failed
- `6` filesystem conflict
- `7` store incompatibility

## License

MIT (c) Cezar Augusto.
