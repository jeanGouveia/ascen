import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function getGoogleWebClientId(): string {
  const fromExtra = Constants.expoConfig?.extra?.googleWebClientId as string | undefined;
  return (fromExtra ?? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();
}

export function getGoogleAndroidClientId(): string {
  const fromExtra = Constants.expoConfig?.extra?.googleAndroidClientId as string | undefined;
  return (fromExtra ?? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '').trim();
}

/** Drive no Android exige Client ID OAuth tipo Android no .env + rebuild. */
export function isGoogleDriveConfigured(): boolean {
  if (Platform.OS === 'android') {
    return getGoogleAndroidClientId().length > 0;
  }
  return getGoogleWebClientId().length > 0;
}

export function getGoogleDriveSetupHint(): string {
  if (Platform.OS === 'android' && !getGoogleAndroidClientId()) {
    return 'Drive: falta EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID no .env (cliente Android no Google Cloud). Rode npm run android de novo após salvar.';
  }
  if (!isGoogleDriveConfigured()) {
    return 'Drive: não configurado neste build.';
  }
  return 'Drive: use Reconectar abaixo antes do backup.';
}

export function assertGoogleAndroidClientIdConfigured(): string {
  const id = getGoogleAndroidClientId();
  if (!id) {
    throw new Error(
      'Falta EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID no .env.\n\n' +
        'Google Cloud → Credenciais → OAuth → Android\n' +
        '• Pacote: com.valtun.ascen\n' +
        '// SHA-1 para OAuth Android:\n' +
        '// - Debug:   5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25\n' +
        '// - Release: obter SHA-1 com: keytool -list -v -keystore ../keystores/ascen-release.jks -alias ascen-key\n' +
        '//            Registrar em: Google Cloud Console → Credenciais → OAuth → Android → pacote: com.valtun.ascen\n\n' +
        'Salve o .env e rode: npm run android'
    );
  }
  return id;
}

export function assertGoogleWebClientIdConfigured(): string {
  const id = getGoogleWebClientId();
  if (!id) {
    throw new Error('Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID no .env.');
  }
  return id;
}

export function assertGoogleDriveClientConfigured(): string {
  if (Platform.OS === 'android') {
    return assertGoogleAndroidClientIdConfigured();
  }
  return assertGoogleWebClientIdConfigured();
}
