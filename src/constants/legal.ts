/**
 * Constantes legais centralizadas do Ascen.
 *
 * LGPD Art. 41: o controlador deve indicar um encarregado (DPO) pelo
 * tratamento de dados pessoais, identificado publicamente na Política
 * de Privacidade, com canal de comunicação próprio.
 *
 * Sempre que uma tela precisar exibir contato de suporte ou DPO, importe
 * destas constantes — NÃO hardcode e-mail em outros arquivos.
 */

import { logger } from '../utils/logger';

/** Nome do encarregado (DPO) — deve aparecer na Política de Privacidade e em telas de suporte. */
export const DPO_NAME = 'Valtun';

/** E-mail do DPO — canal oficial para exercício de direitos do titular (LGPD Art. 18). */
export const DPO_EMAIL = 'dpo@valtun.com.br';

/** E-mail de suporte geral (não-DPO) — dúvidas, bugs, feedback. */
export const SUPPORT_EMAIL = 'suporte@valtun.com.br';

const PRIVACY_URL_DEFAULT = 'https://valtun.com.br/privacidade.html';

/** URL pública da Política de Privacidade (obrigatória na Play Store). */
export const PRIVACY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_URL?.trim() || PRIVACY_URL_DEFAULT;

/** URL pública dos Termos de Uso (em TBD - deixar pronto para futura separação). */
export const TERMS_URL =
  process.env.EXPO_PUBLIC_TERMS_URL?.trim() || PRIVACY_URL_DEFAULT;

  /** URL pública para exclusão de conta via web (obrigatória Play Store policy desde abril/2023). */
export const DELETE_ACCOUNT_URL =
  process.env.EXPO_PUBLIC_DELETE_ACCOUNT_URL?.trim() || 'https://valtun.com.br/excluir-conta';

/** Versão atual dos documentos legais aceitos pelo usuário. */
export const LEGAL_VERSION = '1.0.0';

/** Data de vigência da versão atual (formato ISO YYYY-MM-DD). */
export const LEGAL_EFFECTIVE_DATE = '2025-06-25';

if (__DEV__ && !process.env.EXPO_PUBLIC_PRIVACY_URL?.trim()) {
  logger.warn('[Ascen] EXPO_PUBLIC_PRIVACY_URL não configurada. Usando URL padrão:', PRIVACY_URL_DEFAULT);
}