import * as FileSystem from 'expo-file-system/legacy';

export function userMediaDirectory(userId: string): string {
  const base = FileSystem.documentDirectory;
  if (!base) throw new Error('Armazenamento local indisponível nesta plataforma.');
  return `${base}ascen/${userId}/`;
}

export function localAvatarPath(userId: string): string {
  return `${userMediaDirectory(userId)}avatar.jpg`;
}

export async function ensureUserMediaDir(userId: string): Promise<void> {
  const dir = userMediaDirectory(userId);
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export async function saveAvatarFromPickerUri(userId: string, pickerUri: string): Promise<string> {
  await ensureUserMediaDir(userId);
  const dest = localAvatarPath(userId);
  await FileSystem.copyAsync({ from: pickerUri, to: dest });
  return dest;
}

export async function removeLocalAvatar(userId: string): Promise<void> {
  const p = localAvatarPath(userId);
  const info = await FileSystem.getInfoAsync(p);
  if (info.exists) {
    await FileSystem.deleteAsync(p, { idempotent: true });
  }
}

export async function localAvatarExists(userId: string): Promise<boolean> {
  const p = localAvatarPath(userId);
  const info = await FileSystem.getInfoAsync(p);
  return info.exists;
}

export async function readAvatarAsBase64(userId: string): Promise<string | null> {
  if (!(await localAvatarExists(userId))) return null;
  return FileSystem.readAsStringAsync(localAvatarPath(userId), {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function writeAvatarFromBase64(userId: string, base64: string): Promise<void> {
  await ensureUserMediaDir(userId);
  await FileSystem.writeAsStringAsync(localAvatarPath(userId), base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
