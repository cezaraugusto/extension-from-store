import fs from 'node:fs/promises'
import path from 'node:path'

import extractZip from 'extract-zip'

import {stripCrxHeader} from './crx'

export {stripCrxHeader} from './crx'

async function normalizeExtractedModes (dir: string): Promise<void> {
  await fs.chmod(dir, 0o755)
  const entries = await fs.readdir(dir, {withFileTypes: true})

  for (const entry of entries) {
    const target = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      await normalizeExtractedModes(target)
    } else if (entry.isFile()) {
      const {mode} = await fs.stat(target)

      await fs.chmod(target, mode & 0o111 ? 0o755 : 0o644)
    }
  }
}

export async function extractCrx (
  crxPath: string,
  extractDir: string,
  workDir: string
): Promise<void> {
  const crxBuffer = await fs.readFile(crxPath)
  const zipBuffer = Buffer.from(stripCrxHeader(crxBuffer))
  const zipPath = path.join(workDir, 'payload.zip')

  await fs.writeFile(zipPath, zipBuffer)
  await extractZip(zipPath, {dir: extractDir})
  await normalizeExtractedModes(extractDir)
  await fs.unlink(zipPath).catch(() => undefined)
}

export async function extractZipArchive (
  zipPath: string,
  extractDir: string
): Promise<void> {
  await extractZip(zipPath, {dir: extractDir})
  await normalizeExtractedModes(extractDir)
}
