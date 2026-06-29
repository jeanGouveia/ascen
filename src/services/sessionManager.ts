/**
 * Session Manager - Controla timeouts de sessão.
 * Responsável por timers, inatividade e detecção de background/foreground.
 * Não conhece telas nem UI - apenas gerencia estado de bloqueio.
 */

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos
const BACKGROUND_TIMEOUT_MS = 30 * 1000; // 30 segundos

type LockCallback = () => void;

export class SessionManager {
  private inactivityTimer: NodeJS.Timeout | null = null;
  private backgroundTimestamp: number | null = null;
  private lastActivityTimestamp: number;
  private onLock: LockCallback;

  constructor(onLock: LockCallback) {
    this.onLock = onLock;
    this.lastActivityTimestamp = Date.now();
    this.resetInactivityTimer();
  }

  /**
   * Registra atividade do usuário e reinicia timer de inatividade.
   */
  touch(): void {
    this.lastActivityTimestamp = Date.now();
    this.resetInactivityTimer();
  }

  /**
   * Reinicia o timer de inatividade.
   */
  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.inactivityTimer = setTimeout(() => {
      this.onLock();
    }, INACTIVITY_TIMEOUT_MS);
  }

  /**
   * Chamado quando o app entra em background.
   */
  onAppBackground(): void {
    this.backgroundTimestamp = Date.now();
    // Pausa timer de inatividade enquanto em background
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * Chamado quando o app volta ao foreground.
   * Verifica se passou mais de 30 segundos em background.
   */
  onAppForeground(): void {
    if (!this.backgroundTimestamp) {
      // Se não temos timestamp, assume que não estava em background
      this.resetInactivityTimer();
      return;
    }

    const backgroundDuration = Date.now() - this.backgroundTimestamp;
    this.backgroundTimestamp = null;

    if (backgroundDuration > BACKGROUND_TIMEOUT_MS) {
      // Excedeu timeout de background - bloqueia sessão
      this.onLock();
    } else {
      // Ainda dentro do limite - retoma timer de inatividade
      this.resetInactivityTimer();
    }
  }

  /**
   * Retorna o timestamp da última atividade.
   */
  getLastActivity(): number {
    return this.lastActivityTimestamp;
  }

  /**
   * Limpa recursos ao destruir o manager.
   */
  destroy(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }
}
