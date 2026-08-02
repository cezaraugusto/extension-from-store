import http from 'node:http'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {afterAll, beforeAll, describe, expect, test} from 'vitest'

import {extensionFromStoreError} from '../src/errors'
import {downloadToFile} from '../src/http'

let server: http.Server
let baseUrl = ''
let workDir = ''

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/no-content') {
      res.writeHead(204)
      res.end()

      return
    }

    if (req.url === '/empty-ok') {
      res.writeHead(200, {'content-type': 'application/octet-stream'})
      res.end()

      return
    }

    res.writeHead(200, {'content-type': 'application/octet-stream'})
    res.end('Cr24-not-really-but-bytes')
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()

  if (address && typeof address === 'object') {
    baseUrl = `http://127.0.0.1:${address.port}`
  }

  workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'http-download-'))
})

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve())
  })
  await fs.rm(workDir, {recursive: true, force: true})
})

describe('downloadToFile', () => {
  it('rejects a 204 response as not being served for download', async () => {
    const filePath = path.join(workDir, 'no-content.crx')
    const attempt = downloadToFile(`${baseUrl}/no-content`, filePath, {})

    await expect(attempt).rejects.toBeInstanceOf(extensionFromStoreError)
    await expect(attempt).rejects.toMatchObject({code: 'NotPublic'})
  })

  it('rejects an empty 200 body instead of writing a zero byte file', async () => {
    const filePath = path.join(workDir, 'empty.crx')
    const attempt = downloadToFile(`${baseUrl}/empty-ok`, filePath, {})

    await expect(attempt).rejects.toBeInstanceOf(extensionFromStoreError)
    await expect(attempt).rejects.toMatchObject({code: 'DownloadFailed'})
  })

  it('writes the body when the response has bytes', async () => {
    const filePath = path.join(workDir, 'ok.crx')

    await downloadToFile(`${baseUrl}/ok`, filePath, {})

    const body = await fs.readFile(filePath, 'utf8')

    expect(body).toBe('Cr24-not-really-but-bytes')
  })
})
