import fs from 'node:fs/promises';
import path from 'node:path';
import extractZip from 'extract-zip';
import { extensionFromStoreError } from './errors';

export function stripCrxHeader(buffer: Buffer): Buffer {
  if (buffer.length < 16) {
    throw new extensionFromStoreError('ExtractionFailed', 'CRX file too small');
  }

  const magic = buffer.subarray(0, 4).toString('ascii');

  if (magic !== 'Cr24') {
    throw new extensionFromStoreError('ExtractionFailed', 'Invalid CRX header');
  }

  const version = buffer.readUInt32LE(4);

  if (version === 2) {
    const publicKeyLength = buffer.readUInt32LE(8);
    const signatureLength = buffer.readUInt32LE(12);
    const headerSize = 16 + publicKeyLength + signatureLength;

    return buffer.subarray(headerSize);
  }

  if (version === 3) {
    const headerSize = buffer.readUInt32LE(8);
    const offset = 12 + headerSize;

    return buffer.subarray(offset);
  }

  throw new extensionFromStoreError(
    'ExtractionFailed',
    `Unsupported CRX version ${version}`,
  );
}

export async function extractCrx(
  crxPath: string,
  extractDir: string,
  workDir: string,
): Promise<void> {
  const crxBuffer = await fs.readFile(crxPath);
  const zipBuffer = stripCrxHeader(crxBuffer);
  const zipPath = path.join(workDir, 'payload.zip');

  await fs.writeFile(zipPath, zipBuffer);
  await extractZip(zipPath, { dir: extractDir });
  await fs.unlink(zipPath).catch(() => undefined);
}

export async function extractZipArchive(
  zipPath: string,
  extractDir: string,
): Promise<void> {
  await extractZip(zipPath, { dir: extractDir });
}
