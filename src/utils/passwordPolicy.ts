/**
 * Política de senha do Ascen.
 * Mínimo 8 caracteres + pelo menos uma classe adicional (dígito, maiúscula ou especial).
 * Alinhado com NIST 800-63B e LGPD Art. 46 (segurança).
 */

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordValidation {
  valid: boolean;
  reason?: string;
}

/**
 * Valida uma senha contra a política atual.
 * Retorna {valid: true} se ok, ou {valid: false, reason} com mensagem em PT-BR.
 */
export function validatePassword(password: string): PasswordValidation {
  const trimmed = password.trim();
  if (trimmed.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      reason: `A senha deve ter ao menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    };
  }
  const hasDigit = /\d/.test(trimmed);
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(trimmed);
  if (!hasDigit && !hasUpper && !hasSpecial) {
    return {
      valid: false,
      reason: 'A senha deve conter ao menos um número, uma letra maiúscula ou um caractere especial.',
    };
  }
  return { valid: true };
}
