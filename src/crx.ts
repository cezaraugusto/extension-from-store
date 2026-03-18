import { extensionFromStoreError } from './errors';

function readUInt32LE(bytes: Uint8Array, offset: number): number {
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset + offset,
    Uint32Array.BYTES_PER_ELEMENT,
  );
  return view.getUint32(0, true);
}

function readMagic(bytes: Uint8Array): string {
  let out = '';
  const slice = bytes.subarray(0, 4);
  for (let index = 0; index < slice.length; index += 1) {
    out += String.fromCharCode(slice[index] as number);
  }
  return out;
}

export function stripCrxHeader(buffer: Uint8Array): Uint8Array {
  if (buffer.length < 16) {
    throw new extensionFromStoreError('ExtractionFailed', 'CRX file too small');
  }

  const magic = readMagic(buffer);
  if (magic !== 'Cr24') {
    throw new extensionFromStoreError('ExtractionFailed', 'Invalid CRX header');
  }

  const version = readUInt32LE(buffer, 4);

  if (version === 2) {
    const publicKeyLength = readUInt32LE(buffer, 8);
    const signatureLength = readUInt32LE(buffer, 12);
    const headerSize = 16 + publicKeyLength + signatureLength;
    return buffer.subarray(headerSize);
  }

  if (version === 3) {
    const headerSize = readUInt32LE(buffer, 8);
    return buffer.subarray(12 + headerSize);
  }

  throw new extensionFromStoreError(
    'ExtractionFailed',
    `Unsupported CRX version ${version}`,
  );
}
