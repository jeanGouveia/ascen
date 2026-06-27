/**
 * Logger centralizado para substituir console.log/warn/error.
 * Em produção, evita exposição de dados sensíveis.
 */

const isDev = __DEV__;

export const logger = {
  /**
   * Log de debug - apenas em desenvolvimento.
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Log de informação - em produção imprime apenas mensagem simples.
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.log('[INFO]', ...args);
    } else {
      // Em produção, imprime apenas strings simples
      const message = args
        .map(arg => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return arg.message;
          return '[object]';
        })
        .join(' ');
      console.log('[INFO]', message);
    }
  },

  /**
   * Log de aviso - em produção imprime apenas mensagem.
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn('[WARN]', ...args);
    } else {
      const message = args
        .map(arg => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return arg.message;
          return '[object]';
        })
        .join(' ');
      console.warn('[WARN]', message);
    }
  },

  /**
   * Log de erro - em produção imprime mensagem e Error.message quando existir.
   */
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error('[ERROR]', ...args);
    } else {
      const message = args
        .map(arg => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return arg.message;
          return '[object]';
        })
        .join(' ');
      console.error('[ERROR]', message);
    }
  },
};
