import {describe, expect, test} from 'vitest'

import {fetchExtensionFromStore, extensionFromStoreError} from '../src/index'

describe('extension-from-store input validation', () => {
  it('throws on missing url', async () => {
    await expect(
      fetchExtensionFromStore('' as unknown as any)
    ).rejects.toBeInstanceOf(extensionFromStoreError)
  })

  it('throws on unsupported url', async () => {
    await expect(
      fetchExtensionFromStore('https://example.com' as unknown as any)
    ).rejects.toBeInstanceOf(extensionFromStoreError)
  })

  it('throws when url is missing', async () => {
    await expect(
      fetchExtensionFromStore(undefined as unknown as any)
    ).rejects.toBeInstanceOf(extensionFromStoreError)
  })
})
