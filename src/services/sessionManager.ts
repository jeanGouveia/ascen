/**
 * Session Manager - Controla timeouts de sessão.
 * Responsável por timers, inatividade e detecção de background/foreground.
 * Não conhece telas nem UI - apenas gerencia estado de bloqueio.
 *
 * Arquitetura:
 * - Usa setInterval (1s) para verificar continuamente inatividade
 * - Fonte única de verdade: lastInteraction timestamp
 * - Flags de proteção contra bloqueio durante uso ativo
 * - Configuração via environment variables
 */

import Constants from 'expo-constants';

// Configuração via environment variable com fallback seguro
const SESSION_TIMEOUT_SECONDS = Number(Constants.expoConfig?.extra?.sessionTimeoutSeconds) || 300; // Default 5 minutos
const TIMEOUT_MS = SESSION_TIMEOUT_SECONDS * 1000; // Timeout unificado para foreground e background
const LOCK_COOLDOWN_MS = 30 * 1000; // 30 segundos - cooldown após lock bem-sucedido
const CRITICAL_FLOW_GRACE_MS = 60 * 1000; // 60 segundos de tolerância adicional para fluxos críticos
const INTERACTION_THRESHOLD_MS = 1500; // 1.5 segundos - considerado interação ativa

// Modo teste: log detalhado se timeout <= 10s
const TEST_MODE = SESSION_TIMEOUT_SECONDS <= 10;

type LockCallback = () => void;

export class SessionManager {
  private checkInterval: NodeJS.Timeout | null = null;
  private backgroundTimestamp: number | null = null;
  private lastInteraction: number;
  private onLock: LockCallback;
  private isRunning: boolean = false;
  private criticalFlowActive: boolean = false;
  private lastLockTimestamp: number = 0;
  private isSubmitting: boolean = false;

  constructor(onLock: LockCallback) {
    this.onLock = onLock;
    this.lastInteraction = Date.now();
    if (TEST_MODE) {
      console.log(`[SESSION] TEST MODE - timeout: ${SESSION_TIMEOUT_SECONDS}s`);
    }
  }

  /**
   * Inicia o monitoramento da sessão.
   * Cria um único interval que verifica inatividade a cada segundo.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastInteraction = Date.now();
    
    if (TEST_MODE) {
      console.log('[SESSION] timer started');
    }

    // Interval único que verifica inatividade continuamente
    this.checkInterval = setInterval(() => {
      this.checkInactivity();
    }, 1000);
  }

  /**
   * Para o monitoramento da sessão e limpa o interval.
   */
  stop(): void {
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.backgroundTimestamp = null;
    
    if (TEST_MODE) {
      console.log('[SESSION] timer stopped');
    }
  }

  /**
   * Registra atividade do usuário (fonte única de verdade).
   * Atualiza o timestamp global de última interação.
   */
  touch(): void {
    this.lastInteraction = Date.now();
    
    if (TEST_MODE) {
      console.log('[SESSION] touch');
    }
  }

  /**
   * Define se um fluxo crítico está ativo (ex: modal aberto, formulário em edição).
   * Quando ativo, o lock é inibido mas o timer continua rodando.
   */
  setCriticalFlow(active: boolean): void {
    this.criticalFlowActive = active;
    
    if (TEST_MODE) {
      console.log(`[SESSION] critical flow ${active ? 'started' : 'ended'}`);
    }
  }

  /**
   * Define se o usuário está interagindo ativamente (ex: digitando, scrollando).
   * OBSOLETO: A interação agora é derivada automaticamente de lastInteraction.
   * Este método não faz nada, mantido apenas para compatibilidade.
   */
  setUserInteracting(_active: boolean): void {
    // Interagindo agora é derivado de lastInteraction - método obsoleto
    if (TEST_MODE) {
      console.log('[SESSION] setUserInteracting is deprecated - interaction now derived from lastInteraction');
    }
  }

  /**
   * Define se uma ação crítica está em andamento (ex: submit, loading).
   * Quando ativo, o lock é inibido.
   */
  setSubmitting(active: boolean): void {
    this.isSubmitting = active;
    
    if (TEST_MODE) {
      console.log(`[SESSION] submitting ${active ? 'started' : 'ended'}`);
    }
  }

  /**
   * Verifica inatividade a cada segundo.
   * Calcula o tempo decorrido desde a última interação e bloqueia se necessário.
   */
  private checkInactivity(): void {
    const now = Date.now();
    const timeSinceLastInteraction = now - this.lastInteraction;

    if (TEST_MODE) {
      console.log(`[SESSION] checking inactivity - ${Math.floor(timeSinceLastInteraction / 1000)}s / ${SESSION_TIMEOUT_SECONDS}s`);
    }

    // Verifica se passou do timeout
    if (timeSinceLastInteraction >= TIMEOUT_MS) {
      this.attemptLock();
    }
  }

  /**
   * Tenta bloquear a sessão, respeitando cooldown e flags de proteção.
   */
  private attemptLock(): void {
    const now = Date.now();
    const timeSinceLastInteraction = now - this.lastInteraction;
    const timeSinceLastLock = now - this.lastLockTimestamp;

    // Verifica cooldown (só após lock bem-sucedido)
    if (timeSinceLastLock < LOCK_COOLDOWN_MS) {
      if (TEST_MODE) {
        console.log(`[SESSION] lock attempt skipped - cooldown active (${Math.ceil((LOCK_COOLDOWN_MS - timeSinceLastLock) / 1000)}s remaining)`);
      }
      return;
    }

    // PRIORIDADE DE FLAGS: isSubmitting > criticalFlow > isUserInteracting
    
    // 1. isSubmitting (máxima prioridade) - nunca bloqueia durante submit
    if (this.isSubmitting) {
      if (TEST_MODE) {
        console.log('[SESSION] lock attempt skipped - submitting');
      }
      return;
    }

    // 2. criticalFlow - apenas adia o lock, não bloqueia indefinidamente
    if (this.criticalFlowActive) {
      // Permite tolerância adicional para fluxos críticos
      if (timeSinceLastInteraction < TIMEOUT_MS + CRITICAL_FLOW_GRACE_MS) {
        if (TEST_MODE) {
          console.log(`[SESSION] lock attempt skipped - critical flow active (grace period: ${Math.ceil((TIMEOUT_MS + CRITICAL_FLOW_GRACE_MS - timeSinceLastInteraction) / 1000)}s remaining)`);
        }
        return;
      }
      // Se excedeu a tolerância, prossegue com lock mesmo com criticalFlow ativo
      if (TEST_MODE) {
        console.log('[SESSION] critical flow grace period exceeded - proceeding with lock');
      }
    }

    // 3. isUserInteracting - derivado de lastInteraction
    const isUserInteracting = timeSinceLastInteraction < INTERACTION_THRESHOLD_MS;
    if (isUserInteracting) {
      if (TEST_MODE) {
        console.log('[SESSION] lock attempt skipped - user interacting');
      }
      return;
    }

    // Tudo clear - bloquear
    if (TEST_MODE) {
      console.log('[SESSION] locking app');
    }
    this.onLock();
    
    // Registra timestamp do lock bem-sucedido para cooldown
    this.lastLockTimestamp = now;
    // Reseta lastInteraction após lock para evitar relock imediato
    this.lastInteraction = now;
  }

  /**
   * Chamado quando o app entra em background.
   */
  onAppBackground(): void {
    this.backgroundTimestamp = Date.now();
    
    if (TEST_MODE) {
      console.log('[SESSION] app went to background');
    }
  }

  /**
   * Chamado quando o app volta ao foreground.
   * Verifica se passou mais do que o timeout configurado em background.
   */
  onAppForeground(): void {
    if (!this.backgroundTimestamp) {
      // Se não temos timestamp, assume que não estava em background
      this.lastInteraction = Date.now();
      return;
    }

    const backgroundDuration = Date.now() - this.backgroundTimestamp;
    this.backgroundTimestamp = null;

    if (TEST_MODE) {
      console.log(`[SESSION] app returned from foreground after ${Math.ceil(backgroundDuration / 1000)}s`);
    }

    if (backgroundDuration > TIMEOUT_MS) {
      // Excedeu timeout de background - tenta bloquear sessão
      if (TEST_MODE) {
        console.log('[SESSION] background timeout exceeded - attempting lock');
      }
      this.attemptLock();
    } else {
      // Ainda dentro do limite - mantém lastInteraction como estava (não reseta)
      // Isso evita reset indevido se usuário estava inativo antes do background
      // O lastInteraction continua sendo o timestamp anterior ao background
    }
  }

  /**
   * Retorna o timestamp da última interação.
   */
  getLastActivity(): number {
    return this.lastInteraction;
  }

  /**
   * Limpa recursos ao destruir o manager.
   */
  destroy(): void {
    this.stop();
  }
}
