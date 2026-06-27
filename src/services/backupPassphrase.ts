import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const VERIFY_PREFIX = 'ascen_backup_verify_';
const CACHED_PREFIX = 'ascen_backup_phrase_';
const LEGACY_DEK_PREFIX = 'ascen_snapshot_dek_';

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

/**
 * Armazena apenas o HASH de verificação da passphrase (NUNCA a passphrase em texto plano).
 * A passphrase em si deve ser mantida em memória pela UI durante a sessão de uso.
 */
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
  // NÃO armazenar a passphrase em texto plano (LGPD Art. 46).
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

/**
 * Deprecated: a passphrase NÃO é mais cacheada em texto plano.
 * Sempre retorna null. A passphrase deve ser pedida ao usuário a cada operação.
 * Mantido para compatibilidade de imports — remova as chamadas existentes.
 */
export async function getCachedBackupPassphrase(_userId: string): Promise<string | null> {
  return null;
}

/**
 * Migração: remove qualquer passphrase em texto plano deixada por versões anteriores.
 * Idempotente — seguro chamar múltiplas vezes.
 * Deve ser chamado uma vez na inicialização do app (após login).
 */
export async function purgeLegacyCachedPassphrases(userId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(cachedKey(userId));
  } catch {
    // Item não existe — OK.
  }
}

/** Compat: função legada. Agrega purge — chame purgeLegacyCachedPassphrases em vez desta. */
export async function clearCachedBackupPassphrase(userId: string): Promise<void> {
  await purgeLegacyCachedPassphrases(userId);
}

/**
 * Limpa TODOS os dados de backup do usuário do SecureStore (LGPD Art. 18 VI).
 * Inclui hash de verificação e qualquer passphrase plaintext legada.
 * Idempotente.
 */
/**
 * Limpa TODOS os dados de backup e cripto do usuário do SecureStore (LGPD Art. 18 VI).
 * Inclui: hash de verificação, passphrase plaintext legada, chave de criptografia v1.
 * Idempotente.
 */
export async function purgeAllBackupDataForUser(userId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(verifyKey(userId));
  } catch {
    // OK se não existir
  }
  try {
    await SecureStore.deleteItemAsync(cachedKey(userId));
  } catch {
    // OK se não existir
  }
  try {
    await SecureStore.deleteItemAsync(LEGACY_DEK_PREFIX + userId);
  } catch {
    // OK se não existir
  }
}