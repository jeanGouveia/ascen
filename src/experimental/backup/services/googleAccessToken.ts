import * as SecureStore from 'expo-secure-store';
import type { Session } from '@supabase/supabase-js';
import { logError } from '../../../services/sentry';

const DIRECT_ACCESS_KEY = 'ascen_google_direct_access';
const DIRECT_REFRESH_KEY = 'ascen_google_direct_refresh';

/** Token do Drive vem só do OAuth direto (não do Supabase). */
export async function persistDirectGoogleTokens(accessToken: string, refreshToken?: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(DIRECT_ACCESS_KEY, accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(DIRECT_REFRESH_KEY, refreshToken);
    }
  } catch (e) {
    const error = e instanceof Error ? e : new Error('Failed to persist Google tokens');
    logError(error, { context: 'persistDirectGoogleTokens' });
    throw error;
  }
}

/** @deprecated Supabase mobile não envia provider_token do Drive. */
export async function persistGoogleTokensFromSession(_session: Session | null): Promise<void> {
  /* intencionalmente vazio */
}

export async function getStoredGoogleAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(DIRECT_ACCESS_KEY);
  } catch (e) {
    const error = e instanceof Error ? e : new Error('Failed to get Google access token');
    logError(error, { context: 'getStoredGoogleAccessToken' });
    return null;
  }
}

export async function clearStoredGoogleTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(DIRECT_ACCESS_KEY);
    await SecureStore.deleteItemAsync(DIRECT_REFRESH_KEY);
  } catch (e) {
    const error = e instanceof Error ? e : new Error('Failed to clear Google tokens');
    logError(error, { context: 'clearStoredGoogleTokens' });
  }
}

/** Testa o token chamando a API do Drive (mais confiável que tokeninfo). */
export async function isGoogleAccessTokenValid(token: string): Promise<boolean> {
  try {
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&pageSize=1&fields=files(id)',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.ok || res.status === 404;
  } catch (e) {
    const error = e instanceof Error ? e : new Error('Failed to validate Google access token');
    logError(error, { context: 'isGoogleAccessTokenValid' });
    return false;
  }
}
