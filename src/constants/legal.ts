const PRIVACY_URL_DEFAULT = 'https://valtun.com.br/privacidade.html';

/** URL pública dos Termos de Uso e Política de Privacidade (obrigatória na Play Store). */
export const PRIVACY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_URL?.trim() || PRIVACY_URL_DEFAULT;

if (__DEV__ && !process.env.EXPO_PUBLIC_PRIVACY_URL?.trim()) {
  console.warn('[Ascen] EXPO_PUBLIC_PRIVACY_URL não configurada. Usando URL padrão:', PRIVACY_URL_DEFAULT);
}