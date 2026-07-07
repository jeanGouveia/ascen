/**
 * Logs estruturados da sincronização (Sprint D0 — observabilidade).
 * Removido em produção - não altera comportamento funcional.
 */

export function syncLog(...lines: string[]): void {
  // No-op in production
}

export function syncLogJson(label: string, value: unknown): string {
  // No-op in production
  return '';
}
