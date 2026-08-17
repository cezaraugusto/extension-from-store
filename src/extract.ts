import fs from 'node:fs/promises'
import path from 'node:path'

import {unzipSync} from 'fflate'

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

// In-process unzip with a zip-slip guard. Every entry is written as a plain
// file under extractDir: entries that name absolute paths or escape the
// extraction root are refused, and symlink entries are never materialized
// as symlinks, so a hostile archive cannot read or write outside the root.
async function writeZipEntries (
  zipData: Uint8Array,
  extractDir: string
): Promise<void> {
  const root = path.resolve(extractDir)
  const entries = unzipSync(zipData)

  await fs.mkdir(root, {recursive: true})

  for (const [name, data] of Object.entries(entries)) {
    const normalized = name.replace(/\\/g, '/')
    const target = path.resolve(root, normalized)
    const relative = path.relative(root, target)

    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(
        `Refusing to extract zip entry outside the extraction dir: ${name}`
      )
    }

    if (normalized.endsWith('/')) {
      await fs.mkdir(target, {recursive: true})
      continue
    }

    await fs.mkdir(path.dirname(target), {recursive: true})
    await fs.writeFile(target, data)
  }
}

export async function extractCrx (
  crxPath: string,
  extractDir: string,
  // Kept for API compatibility: the in-memory unzip no longer stages a
  // payload.zip in the work dir.
  _workDir?: string
): Promise<void> {
  const crxBuffer = await fs.readFile(crxPath)
  const zipBuffer = Buffer.from(stripCrxHeader(crxBuffer))

  await writeZipEntries(new Uint8Array(zipBuffer), extractDir)
  await normalizeExtractedModes(extractDir)
}

export async function extractZipArchive (
  zipPath: string,
  extractDir: string
): Promise<void> {
  const zipBuffer = await fs.readFile(zipPath)

  await writeZipEntries(new Uint8Array(zipBuffer), extractDir)
  await normalizeExtractedModes(extractDir)
}
