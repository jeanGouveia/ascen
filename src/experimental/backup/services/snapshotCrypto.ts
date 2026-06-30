import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { SNAPSHOT_MAGIC, SNAPSHOT_FORMAT_V2 } from '../constants/cloudBackup';

const LEGACY_DEK_PREFIX = 'ascen_snapshot_dek_';
const PBKDF2_ITERATIONS = 12000;

function hexToUint8(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function uint8ToHex(u: Uint8Array): string {
  return Array.from(u).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getLegacyDeviceKey(userId: string): Promise<Uint8Array> {
  const storageKey = LEGACY_DEK_PREFIX + userId;
  let hex = await SecureStore.getItemAsync(storageKey);
  if (!hex) {
    const raw = await Crypto.getRandomBytesAsync(32);
    hex = uint8ToHex(new Uint8Array(raw));
    await SecureStore.setItemAsync(storageKey, hex);
  }
  return hexToUint8(hex);
}

/** Deriva chave de 32 bytes a partir da senha de backup (v2). */
export async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
  let state = hexToUint8(
    await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      passphrase.trim() + uint8ToHex(salt),
      { encoding: Crypto.CryptoEncoding.HEX }
    )
  );
  for (let i = 0; i < PBKDF2_ITERATIONS; i++) {
    state = hexToUint8(
      await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        uint8ToHex(state) + i.toString(),
        { encoding: Crypto.CryptoEncoding.HEX }
      )
    );
  }
  return state;
}

export async function encryptSnapshotUtf8(plaintext: string, passphrase: string): Promise<Uint8Array> {
  const saltRaw = await Crypto.getRandomBytesAsync(16);
  const salt = new Uint8Array(saltRaw);
  const key = await deriveKeyFromPassphrase(passphrase, salt);
  const msg = naclUtil.decodeUTF8(plaintext);
  const rawNonce = await Crypto.getRandomBytesAsync(24);
  const nonce = new Uint8Array(rawNonce);
  const boxed = nacl.secretbox(msg, nonce, key);
  if (!boxed) throw new Error('Falha ao cifrar backup.');
  const headerLen = SNAPSHOT_MAGIC.length + 1 + salt.length + nonce.length;
  const out = new Uint8Array(headerLen + boxed.length);
  out.set(SNAPSHOT_MAGIC, 0);
  out[SNAPSHOT_MAGIC.length] = SNAPSHOT_FORMAT_V2;
  out.set(salt, SNAPSHOT_MAGIC.length + 1);
  out.set(nonce, SNAPSHOT_MAGIC.length + 1 + salt.length);
  out.set(boxed, headerLen);
  return out;
}

export function isSnapshotV2(bytes: Uint8Array): boolean {
  if (bytes.length < SNAPSHOT_MAGIC.length + 1) return false;
  for (let i = 0; i < SNAPSHOT_MAGIC.length; i++) {
    if (bytes[i] !== SNAPSHOT_MAGIC[i]) return false;
  }
  return bytes[SNAPSHOT_MAGIC.length] === SNAPSHOT_FORMAT_V2;
}

export async function decryptSnapshotToUtf8(bytes: Uint8Array, passphrase: string): Promise<string> {
  if (!isSnapshotV2(bytes)) {
    throw new Error('Este backup usa o formato antigo. Tente restaurar sem senha de backup ou gere um novo backup.');
  }
  const saltStart = SNAPSHOT_MAGIC.length + 1;
  const salt = bytes.subarray(saltStart, saltStart + 16);
  const nonceStart = saltStart + 16;
  const nonce = bytes.subarray(nonceStart, nonceStart + 24);
  const boxed = bytes.subarray(nonceStart + 24);
  const key = await deriveKeyFromPassphrase(passphrase, salt);
  const opened = nacl.secretbox.open(boxed, nonce, key);
  if (!opened) {
    throw new Error('Senha de backup incorreta ou arquivo corrompido.');
  }
  return naclUtil.encodeUTF8(opened);
}

/** v1 legado: descriptografa com chave gerada neste aparelho. */
export async function decryptLegacyV1Snapshot(bytes: Uint8Array, userId: string): Promise<string> {
  const min = SNAPSHOT_MAGIC.length + 24 + 16;
  if (bytes.length < min) throw new Error('Arquivo de backup inválido.');
  for (let i = 0; i < SNAPSHOT_MAGIC.length; i++) {
    if (bytes[i] !== SNAPSHOT_MAGIC[i]) throw new Error('Formato de backup não reconhecido.');
  }
  if (isSnapshotV2(bytes)) {
    throw new Error('Use a senha de backup para este arquivo.');
  }
  const nonce = bytes.subarray(SNAPSHOT_MAGIC.length, SNAPSHOT_MAGIC.length + 24);
  const boxed = bytes.subarray(SNAPSHOT_MAGIC.length + 24);
  const key = await getLegacyDeviceKey(userId);
  const opened = nacl.secretbox.open(boxed, nonce, key);
  if (!opened) {
    throw new Error(
      'Não foi possível decifrar. Gere um novo backup com senha de backup (v2) para usar em outro aparelho ou com sua família.'
    );
  }
  return naclUtil.encodeUTF8(opened);
}

export async function decryptSnapshotAuto(
  bytes: Uint8Array,
  passphrase: string,
  userId: string
): Promise<string> {
  if (isSnapshotV2(bytes)) {
    return decryptSnapshotToUtf8(bytes, passphrase);
  }
  return decryptLegacyV1Snapshot(bytes, userId);
}
