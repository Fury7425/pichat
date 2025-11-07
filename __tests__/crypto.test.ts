import { createIdentity, encryptFor, decryptFrom } from '../src/miniCrypto';

test('demo e2ee roundtrip', async () => {
  const a = await createIdentity();
  const b = await createIdentity();
  const msg = new TextEncoder().encode('hello');
  const env = await encryptFor(a.privKeyJwk, b.pubKeyB64, msg);
  const pt = await decryptFrom(b.privKeyJwk, a.pubKeyB64, env.ivB64, env.ctB64);
  expect(new TextDecoder().decode(pt)).toBe('hello');
});
