/**
 * Motivos pelos quais uma sincronização pode ser solicitada.
 * Utilizado pelo SyncLifecycleProvider para coordenar eventos de sync.
 */
export enum SyncReason {
  INITIAL = 'INITIAL',
  CRUD = 'CRUD',
  APP_FOREGROUND = 'APP_FOREGROUND',
  NAVIGATION = 'NAVIGATION',
  MANUAL = 'MANUAL',
}
