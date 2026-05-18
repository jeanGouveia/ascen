import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const VERIFY_PREFIX = 'ascen_backup_verify_';
const CACHED_PREFIX = 'ascen_backup_phrase_';

function verifyKey(userId: string): string {
  return VERIFY_PREFIX + userId;
}

function cachedKey(userId: string): string {
  return CACHED_PREFIX + userId;
}

export async function hasBackupPassphraseConfigured(userId: string): Promise<boolean> {
  const v = await SecureStore.getItemAsync(verifyKey(userId));
  return Boolean(v);
}

export async function setBackupPassphrase(userId: string, passphrase: string): Promise<void> {
  const trimmed = passphrase.trim();
  if (trimmed.length < 8) {
    throw new Error('A senha de backup deve ter pelo menos 8 caracteres.');
  }
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${userId}:${trimmed}`,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  await SecureStore.setItemAsync(verifyKey(userId), digest);
  await SecureStore.setItemAsync(cachedKey(userId), trimmed);
}

export async function verifyBackupPassphrase(userId: string, passphrase: string): Promise<boolean> {
  const expected = await SecureStore.getItemAsync(verifyKey(userId));
  if (!expected) return false;
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${userId}:${passphrase.trim()}`,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return digest === expected;
}

/** Frase guardada neste aparelho após configuração (para backup/restore automático). */
export async function getCachedBackupPassphrase(userId: string): Promise<string | null> {
  return SecureStore.getItemAsync(cachedKey(userId));
}

export async function clearCachedBackupPassphrase(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(cachedKey(userId));
}
