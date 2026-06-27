/**
 * Utilitários de sanitização de entrada de texto.
 * Centraliza limpeza de texto para consistência em todo o app.
 */

/**
 * Sanitiza e-mail: trim, lowercase, remove espaços internos.
 * @example "  Jean@Email.COM " → "jean@email.com"
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Sanitiza nome: trim, colapsa múltiplos espaços em um.
 * Preserva acentos e capitalização original.
 * @example "   João    da    Silva   " → "João da Silva"
 */
export function sanitizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitiza texto genérico: trim, colapsa múltiplos espaços em um.
 * Preserva acentos, emojis e caracteres especiais.
 */
export function sanitizeGenericText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}
