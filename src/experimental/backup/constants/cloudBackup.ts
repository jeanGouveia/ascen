/** Bucket privado no Supabase Storage. */
export const SNAPSHOT_STORAGE_BUCKET = 'ascen-snapshots';

export const FAMILY_STORAGE_PREFIX = 'family';

export function personalSnapshotPath(userId: string): string {
  return `${userId}/device-snapshot.enc`;
}

export function familySnapshotPath(familyId: string): string {
  return `${FAMILY_STORAGE_PREFIX}/${familyId}/device-snapshot.enc`;
}

/** @deprecated use familySnapshotPath */
export function householdSnapshotPath(familyId: string): string {
  return familySnapshotPath(familyId);
}

/** Prefixo binário do arquivo de snapshot. */
export const SNAPSHOT_MAGIC = new Uint8Array([0x41, 0x53, 0x4e, 0x31]); // "ASN1"

export const SNAPSHOT_FORMAT_V1 = 1;
export const SNAPSHOT_FORMAT_V2 = 2;

export const GOOGLE_DRIVE_SNAPSHOT_NAME = 'ascen-snapshot.enc';

export const GOOGLE_OAUTH_SCOPES =
  'openid email profile https://www.googleapis.com/auth/drive.appdata';

export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
