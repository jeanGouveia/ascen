import { GOOGLE_DRIVE_SNAPSHOT_NAME } from '../constants/cloudBackup';
import { uint8ToArrayBuffer } from '../../../utils/binary';
import { getStoredGoogleAccessToken, isGoogleAccessTokenValid } from './googleAccessToken';
import { isGoogleDriveConfigured } from '../config/googleOAuth';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export async function getGoogleAccessToken(): Promise<string | null> {
  if (!isGoogleDriveConfigured()) return null;
  const cached = await getStoredGoogleAccessToken();
  if (!cached) return null;
  if (await isGoogleAccessTokenValid(cached)) return cached;
  return null;
}

export async function hasGoogleDriveAccess(): Promise<boolean> {
  return Boolean(await getGoogleAccessToken());
}

export function userHasGoogleProvider(user: { app_metadata?: { provider?: string }; identities?: { provider: string }[] } | null): boolean {
  if (!user) return false;
  if (user.app_metadata?.provider === 'google') return true;
  return Boolean(user.identities?.some(i => i.provider === 'google'));
}

async function findAppDataFileId(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${GOOGLE_DRIVE_SNAPSHOT_NAME}' and trashed=false`);
  const res = await fetch(
    `${DRIVE_API}/files?spaces=appDataFolder&q=${q}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 401) {
      throw new Error('Token do Drive expirou. Use Perfil → Reconectar Google Drive.');
    }
    throw new Error(`Google Drive: ${res.status} ${t}`);
  }
  const json = (await res.json()) as { files?: { id: string }[] };
  return json.files?.[0]?.id ?? null;
}

export async function uploadToGoogleDrive(bytes: Uint8Array, token: string): Promise<void> {
  const existingId = await findAppDataFileId(token);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/octet-stream',
  };
  const body = uint8ToArrayBuffer(bytes);

  if (existingId) {
    const res = await fetch(`${DRIVE_UPLOAD}/files/${existingId}?uploadType=media`, {
      method: 'PATCH',
      headers,
      body,
    });
    if (!res.ok) throw new Error(`Falha ao atualizar no Drive: ${res.status} ${await res.text()}`);
    return;
  }

  const metaRes = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: GOOGLE_DRIVE_SNAPSHOT_NAME, parents: ['appDataFolder'] }),
  });
  if (!metaRes.ok) throw new Error(`Falha ao criar arquivo no Drive: ${await metaRes.text()}`);
  const meta = (await metaRes.json()) as { id: string };
  const res = await fetch(`${DRIVE_UPLOAD}/files/${meta.id}?uploadType=media`, {
    method: 'PATCH',
    headers,
    body,
  });
  if (!res.ok) throw new Error(`Falha ao enviar ao Drive: ${await res.text()}`);
}

export async function downloadFromGoogleDrive(token: string): Promise<Uint8Array | null> {
  const fileId = await findAppDataFileId(token);
  if (!fileId) return null;
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Falha ao baixar do Drive: ${await res.text()}`);
  return new Uint8Array(await res.arrayBuffer());
}
