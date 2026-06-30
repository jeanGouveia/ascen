import * as Application from 'expo-application';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { discovery } from 'expo-auth-session/providers/google';
import { GOOGLE_DRIVE_SCOPE } from '../constants/cloudBackup';
import { assertGoogleDriveClientConfigured } from '../config/googleOAuth';
import { persistDirectGoogleTokens, isGoogleAccessTokenValid } from './googleAccessToken';

WebBrowser.maybeCompleteAuthSession();

const DRIVE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  GOOGLE_DRIVE_SCOPE,
];

function getRedirectUri(): string {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return AuthSession.makeRedirectUri({
      native: `${Application.applicationId}:/oauthredirect`,
    });
  }
  return AuthSession.makeRedirectUri({ scheme: 'ascen', path: 'google-drive' });
}

/**
 * OAuth Google só para Drive (Android usa cliente OAuth "Android", não URI no cliente Web).
 */
export async function authorizeGoogleDriveDirect(): Promise<string> {
  const clientId = assertGoogleDriveClientConfigured();
  const redirectUri = getRedirectUri();

  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: DRIVE_SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });

  const result = await request.promptAsync(discovery);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Autorização do Google Drive cancelada.');
  }

  if (result.type !== 'success') {
    throw new Error('Não foi possível concluir o login no Google.');
  }

  const code = result.params.code;
  if (!code) {
    throw new Error('Google não retornou código de autorização.');
  }

  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code,
      redirectUri,
      extraParams: {
        code_verifier: request.codeVerifier ?? '',
      },
    },
    discovery
  );

  if (!tokenResponse.accessToken) {
    throw new Error('Google não retornou token de acesso.');
  }

  await persistDirectGoogleTokens(tokenResponse.accessToken, tokenResponse.refreshToken ?? undefined);

  const valid = await isGoogleAccessTokenValid(tokenResponse.accessToken);
  if (!valid) {
    throw new Error(
      'Token sem permissão do Drive. Ative a Google Drive API no Google Cloud e crie o cliente OAuth Android corretamente.'
    );
  }

  return tokenResponse.accessToken;
}

export function getGoogleDriveRedirectUri(): string {
  return getRedirectUri();
}
