import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {strToU8, zipSync} from 'fflate'
import {describe, expect, test} from 'vitest'

import {extractCrx, extractZipArchive, stripCrxHeader} from '../src/extract'

function buildCrx2 (payload: Buffer): Buffer {
  const publicKey = Buffer.from('ABCD')
  const signature = Buffer.from('EF')
  const header = Buffer.alloc(16)

  header.write('Cr24', 0, 'ascii')
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(publicKey.length, 8)
  header.writeUInt32LE(signature.length, 12)

  return Buffer.concat([header, publicKey, signature, payload])
}

function buildCrx3 (payload: Buffer): Buffer {
  const headerPayload = Buffer.from('SIGNSIGN')
  const header = Buffer.alloc(12)

  header.write('Cr24', 0, 'ascii')
  header.writeUInt32LE(3, 4)
  header.writeUInt32LE(headerPayload.length, 8)

  return Buffer.concat([header, headerPayload, payload])
}

function unixAttrs (mode: number): number {
  return (mode << 16) >>> 0
}

function buildUnreadableZip (): Buffer {
  return Buffer.from(
    zipSync({
      '_locales/': [
        new Uint8Array(0),
        {os: 3, attrs: unixAttrs(0o41363)}
      ],
      '_locales/messages.json': [
        strToU8('{"name": {"message": "ok"}}'),
        {os: 3, attrs: unixAttrs(0o101204)}
      ],
      'manifest.json': [
        strToU8('{"manifest_version": 3}'),
        {os: 3, attrs: unixAttrs(0o101204)}
      ]
    })
  )
}

describe('stripCrxHeader', () => {
  it('extracts payload from CRX2 buffer', () => {
    const payload = Buffer.from('ZIPDATA')
    const crx = buildCrx2(payload)
    const extracted = stripCrxHeader(crx)

    expect(extracted.toString('utf8')).toBe('ZIPDATA')
  })

  it('throws on invalid header', () => {
    const bad = Buffer.from('BAD!')

    expect(() => stripCrxHeader(bad)).toThrow()
  })
})

describe('extraction mode normalization', () => {
  it('makes archives with unreadable unix modes readable after unzip', async () => {
    const workDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'extract-modes-')
    )

    try {
      const zipPath = path.join(workDir, 'payload.zip')
      const extractDir = path.join(workDir, 'extracted')

      await fs.writeFile(zipPath, buildUnreadableZip())
      await fs.mkdir(extractDir, {recursive: true})
      await extractZipArchive(zipPath, extractDir)

      const manifest = await fs.readFile(
        path.join(extractDir, 'manifest.json'),
        'utf8'
      )

      expect(manifest).toBe('{"manifest_version": 3}')

      const localeEntries = await fs.readdir(
        path.join(extractDir, '_locales')
      )

      expect(localeEntries).toEqual(['messages.json'])

      const dirMode = (
        await fs.stat(path.join(extractDir, '_locales'))
      ).mode & 0o777

      const fileMode = (
        await fs.stat(path.join(extractDir, 'manifest.json'))
      ).mode & 0o777

      expect(dirMode).toBe(0o755)
      expect(fileMode).toBe(0o644)
    } finally {
      await fs.rm(workDir, {recursive: true, force: true})
    }
  })

  it('extracts a CRX3 whose zip carries unreadable unix modes', async () => {
    const workDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'extract-crx3-modes-')
    )

    try {
      const crxPath = path.join(workDir, 'archive.crx')
      const extractDir = path.join(workDir, 'extracted')

      await fs.writeFile(crxPath, buildCrx3(buildUnreadableZip()))
      await fs.mkdir(extractDir, {recursive: true})
      await extractCrx(crxPath, extractDir, workDir)

      const manifest = await fs.readFile(
        path.join(extractDir, 'manifest.json'),
        'utf8'
      )

      expect(manifest).toBe('{"manifest_version": 3}')
    } finally {
      await fs.rm(workDir, {recursive: true, force: true})
    }
  })
})

describe('hostile archives', () => {
  it('refuses entries that traverse outside the extraction dir', async () => {
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'extract-slip-'))

    try {
      const zipPath = path.join(workDir, 'payload.zip')
      const extractDir = path.join(workDir, 'extracted')
      const outside = path.join(workDir, 'pwned.txt')

      await fs.writeFile(
        zipPath,
        Buffer.from(
          zipSync({
            '../pwned.txt': strToU8('escaped'),
            'manifest.json': strToU8('{"manifest_version": 3}')
          })
        )
      )
      await fs.mkdir(extractDir, {recursive: true})

      await expect(extractZipArchive(zipPath, extractDir)).rejects.toThrow(
        /outside the extraction dir/
      )
      await expect(fs.access(outside)).rejects.toThrow()
    } finally {
      await fs.rm(workDir, {recursive: true, force: true})
    }
  })

  it('never materializes symlink entries as symlinks', async () => {
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'extract-link-'))

    try {
      const zipPath = path.join(workDir, 'payload.zip')
      const extractDir = path.join(workDir, 'extracted')

      // 0o120777 marks the entry as a unix symlink; the data is its target.
      await fs.writeFile(
        zipPath,
        Buffer.from(
          zipSync({
            evil: [
              strToU8('../../../../etc/passwd'),
              {os: 3, attrs: unixAttrs(0o120777)}
            ],
            'manifest.json': strToU8('{"manifest_version": 3}')
          })
        )
      )
      await fs.mkdir(extractDir, {recursive: true})
      await extractZipArchive(zipPath, extractDir)

      const stat = await fs.lstat(path.join(extractDir, 'evil'))

      expect(stat.isSymbolicLink()).toBe(false)
      expect(stat.isFile()).toBe(true)
    } finally {
      await fs.rm(workDir, {recursive: true, force: true})
    }
  })
})
