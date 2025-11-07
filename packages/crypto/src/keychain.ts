import { toBase64, fromBase64 } from '@pichat/utils';

let Keychain: typeof import('react-native-keychain') | undefined;
try {
  // React Native runtime
  Keychain = require('react-native-keychain');
} catch {
  Keychain = undefined;
}

const memoryVault = new Map<string, string>();

export async function storeSecret(ref: string, payload: Uint8Array): Promise<void> {
  if (Keychain?.setInternetCredentials) {
    await Keychain.setInternetCredentials(ref, ref, toBase64(payload), {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      storage: Keychain.STORAGE_TYPE.AES
    });
    return;
  }
  memoryVault.set(ref, toBase64(payload));
}

export async function loadSecret(ref: string): Promise<Uint8Array | undefined> {
  if (Keychain?.getInternetCredentials) {
    const creds = await Keychain.getInternetCredentials(ref);
    if (creds && creds.password) {
      return fromBase64(creds.password);
    }
    return undefined;
  }
  const data = memoryVault.get(ref);
  return data ? fromBase64(data) : undefined;
}

export async function deleteSecret(ref: string): Promise<void> {
  if (Keychain?.resetInternetCredentials) {
    await Keychain.resetInternetCredentials(ref);
    return;
  }
  memoryVault.delete(ref);
}
