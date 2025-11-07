import { cryptoClient } from './cryptoClient';

export async function exportRecovery(passphrase: string): Promise<Uint8Array> {
  return cryptoClient.exportRecoveryKit(passphrase);
}

export async function importRecovery(blob: Uint8Array, passphrase: string): Promise<void> {
  await cryptoClient.importRecoveryKit(blob, passphrase);
}
