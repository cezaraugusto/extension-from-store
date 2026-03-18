import fs from 'node:fs/promises';
import path from 'node:path';
import extractZip from 'extract-zip';
import { stripCrxHeader } from './crx';

export { stripCrxHeader } from './crx';

export async function extractCrx(
  crxPath: string,
  extractDir: string,
  workDir: string,
): Promise<void> {
  const crxBuffer = await fs.readFile(crxPath);
  const zipBuffer = Buffer.from(stripCrxHeader(crxBuffer));
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
