import { describe, expect, test } from 'vitest';
import { stripCrxHeader } from '../src/extract';

function buildCrx2(payload: Buffer): Buffer {
  const publicKey = Buffer.from('ABCD');
  const signature = Buffer.from('EF');
  const header = Buffer.alloc(16);
  header.write('Cr24', 0, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(publicKey.length, 8);
  header.writeUInt32LE(signature.length, 12);

  return Buffer.concat([header, publicKey, signature, payload]);
}

describe('stripCrxHeader', () => {
  test('extracts payload from CRX2 buffer', () => {
    const payload = Buffer.from('ZIPDATA');
    const crx = buildCrx2(payload);
    const extracted = stripCrxHeader(crx);
    expect(extracted.toString('utf8')).toBe('ZIPDATA');
  });

  test('throws on invalid header', () => {
    const bad = Buffer.from('BAD!');
    expect(() => stripCrxHeader(bad)).toThrow();
  });
});
