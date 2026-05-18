import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { exportTablesForSnapshot } from '../db/localDataDb';
import { getLocalFamilyId, getLocalJoinCode } from './family';

export async function exportJsonAndShare(): Promise<void> {
  const tables = await exportTablesForSnapshot();
  const familyId = await getLocalFamilyId();
  const joinCode = await getLocalJoinCode();

  const payload = {
    v: 2,
    exportedAt: new Date().toISOString(),
    familyId,
    joinCode,
    ...tables,
  };

  const json = JSON.stringify(payload, null, 2);
  const path = `${FileSystem.cacheDirectory}ascen-export-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });

  await Share.share({
    title: 'Exportar Ascen',
    message: json.length < 8000 ? json : 'Backup Ascen (arquivo JSON)',
    url: path,
  });
}
