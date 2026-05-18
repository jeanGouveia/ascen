import { supabase } from './supabase';
import {
  SNAPSHOT_STORAGE_BUCKET,
  personalSnapshotPath,
  familySnapshotPath,
} from '../constants/cloudBackup';
import { encryptSnapshotUtf8, decryptSnapshotAuto } from './snapshotCrypto';
import {
  exportTablesForSnapshot,
  replaceAllDataFromSnapshot,
  metaSet,
  metaGet,
  type SnapshotTablesV1,
} from '../db/localDataDb';
import { readAvatarAsBase64, writeAvatarFromBase64, removeLocalAvatar } from './localAvatar';
import { getLocalFamilyId } from './family';
import { uint8ToArrayBuffer, uint8ToBase64, base64ToUint8 } from '../utils/binary';
import {
  downloadFromGoogleDrive,
  getGoogleAccessToken,
  uploadToGoogleDrive,
} from './googleDriveSnapshot';

export type BackupStorageTarget = 'supabase' | 'google_drive' | 'both';

const META_STORAGE_TARGET = 'backup_storage_target';

/** Converte Blob para Uint8Array (compatível com React Native). */
async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    try {
      const buf = await blob.arrayBuffer();
      return new Uint8Array(buf);
    } catch {
      /* fallback */
    }
  }

  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new Error('Falha ao ler blob do backup.'));
    reader.readAsArrayBuffer(blob);
  });
}

async function resolveSnapshotPath(userId: string): Promise<string> {
  const familyId = await getLocalFamilyId();
  if (familyId) return familySnapshotPath(familyId);
  return personalSnapshotPath(userId);
}

export async function getBackupStorageTarget(): Promise<BackupStorageTarget> {
  try {
    const v = await metaGet(META_STORAGE_TARGET);
    if (v === 'google_drive' || v === 'both' || v === 'supabase') return v;
  } catch {
    /* ignore */
  }
  return 'supabase';
}

export async function setBackupStorageTarget(target: BackupStorageTarget): Promise<void> {
  await metaSet(META_STORAGE_TARGET, target);
}

async function uploadBytesToSupabase(path: string, encrypted: Uint8Array): Promise<void> {
  const body = uint8ToArrayBuffer(encrypted);
  const { error } = await supabase.storage.from(SNAPSHOT_STORAGE_BUCKET).upload(path, body, {
    upsert: true,
    contentType: 'application/octet-stream',
  });
  if (error) throw new Error(error.message);
}

async function downloadBytesFromSupabase(path: string): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage.from(SNAPSHOT_STORAGE_BUCKET).download(path);
  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('not found') || msg.includes('404') || msg.includes('does not exist')) {
      return null;
    }
    throw new Error(error.message);
  }
  if (!data) return null;

  let bytes = await blobToUint8Array(data);

  // Verifica integridade do cabeçalho; se corrompido, tenta via URL assinada + arrayBuffer
  if (!looksLikeSnapshot(bytes)) {
    const { data: signed, error: signErr } = await supabase.storage
      .from(SNAPSHOT_STORAGE_BUCKET)
      .createSignedUrl(path, 120);
    if (signErr || !signed?.signedUrl) {
      throw new Error('Backup baixado está corrompido ou em formato inválido.');
    }
    const res = await fetch(signed.signedUrl);
    if (!res.ok) throw new Error(`Falha ao baixar backup: ${res.status}`);
    bytes = new Uint8Array(await res.arrayBuffer());
  }

  return bytes;
}

function looksLikeSnapshot(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  return (
    bytes[0] === 0x41 &&
    bytes[1] === 0x53 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x31
  );
}

export async function uploadEncryptedSnapshot(
  userId: string,
  passphrase: string,
  target?: BackupStorageTarget
): Promise<void> {
  const tables = await exportTablesForSnapshot();
  const avatarBase64 = await readAvatarAsBase64(userId);
  const payload: SnapshotTablesV1 = {
    v: 1,
    exportedAt: new Date().toISOString(),
    transactions: tables.transactions,
    categories: tables.categories,
    recurring: tables.recurring,
    avatarBase64: avatarBase64 ?? undefined,
  };
  const encrypted = await encryptSnapshotUtf8(JSON.stringify(payload), passphrase);
  const storageTarget = target ?? (await getBackupStorageTarget());
  const path = await resolveSnapshotPath(userId);

  if (storageTarget === 'supabase' || storageTarget === 'both') {
    await uploadBytesToSupabase(path, encrypted);
  }

  if (storageTarget === 'google_drive' || storageTarget === 'both') {
    const token = await getGoogleAccessToken();
    if (!token) {
      throw new Error(
        'Drive não conectado. Perfil → Conectar Google Drive (é diferente do login da conta). Ou use destino Supabase.'
      );
    }
    await uploadToGoogleDrive(encrypted, token);
  }

  await metaSet('last_snapshot_upload_at', new Date().toISOString());
}

export async function downloadEncryptedSnapshot(
  userId: string,
  target?: BackupStorageTarget
): Promise<Uint8Array | null> {
  const storageTarget = target ?? (await getBackupStorageTarget());
  const path = await resolveSnapshotPath(userId);

  if (storageTarget === 'google_drive') {
    const token = await getGoogleAccessToken();
    if (!token) throw new Error('Sessão Google sem token do Drive. Entre de novo com Google.');
    return downloadFromGoogleDrive(token);
  }

  if (storageTarget === 'both') {
    const token = await getGoogleAccessToken();
    if (token) {
      const fromDrive = await downloadFromGoogleDrive(token);
      if (fromDrive) return fromDrive;
    }
    return downloadBytesFromSupabase(path);
  }

  return downloadBytesFromSupabase(path);
}

export async function restoreFromEncryptedSnapshot(
  bytes: Uint8Array,
  userId: string,
  passphrase: string
): Promise<void> {
  const json = await decryptSnapshotAuto(bytes, passphrase, userId);
  const payload = JSON.parse(json) as SnapshotTablesV1;
  if (payload.v !== 1) throw new Error('Versão de backup não suportada.');
  await replaceAllDataFromSnapshot(payload);
  if (payload.avatarBase64) {
    await writeAvatarFromBase64(userId, payload.avatarBase64);
  } else {
    await removeLocalAvatar(userId);
  }
}

/** Utilitário para validar round-trip local (debug). */
export function snapshotBytesToBase64(bytes: Uint8Array): string {
  return uint8ToBase64(bytes);
}

export function snapshotBytesFromBase64(b64: string): Uint8Array {
  return base64ToUint8(b64);
}
