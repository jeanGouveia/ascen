import { __DEV__ } from 'expo-constants';

/** URL pública dos Termos de Uso e Política de Privacidade (obrigatória na Play Store). */
export const PRIVACY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_URL?.trim() || '';

if (__DEV__ && !PRIVACY_URL) {
  console.warn('[Ascen] EXPO_PUBLIC_PRIVACY_URL não configurada. O link de política de privacidade estará vazio.');
}
