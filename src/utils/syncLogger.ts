/**
 * Logs estruturados da sincronização (Sprint D0 — observabilidade).
 * Remover este módulo e suas chamadas não altera nenhum comportamento funcional.
 */

function formatTimestamp(): string {
  const d = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

export function syncLog(...lines: string[]): void {
  console.log(`[SYNC][${formatTimestamp()}]\n${lines.join('\n')}`);
}

/** Serializa objetos para logs sem alterar comportamento funcional. */
export function syncLogJson(label: string, value: unknown): string {
  try {
    return `${label}=${JSON.stringify(value)}`;
  } catch {
    return `${label}=[unserializable]`;
  }
}
