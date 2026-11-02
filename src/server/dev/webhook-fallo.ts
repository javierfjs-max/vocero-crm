import { isMockEnabled } from "@/lib/env";

/**
 * 047 — Fallo de prueba del procesamiento de webhooks (solo con mocks).
 *
 * El arnés E2E pide que los siguientes N procesamientos lancen, para ver al
 * barrido reintentar y agotar sin romper nada de verdad. En globalThis porque
 * en dev los módulos se evalúan más de una vez. Fuera de los mocks es un no-op.
 */
const g = globalThis as unknown as { __voceroWebhookFallos?: number };

export function programarFallosDePrueba(veces: number): void {
  g.__voceroWebhookFallos = Math.max(0, Math.floor(veces));
}

export function fallosDePruebaPendientes(): number {
  return g.__voceroWebhookFallos ?? 0;
}

export function lanzarFalloDePrueba(): void {
  if (!isMockEnabled()) return;
  const quedan = g.__voceroWebhookFallos ?? 0;
  if (quedan <= 0) return;
  g.__voceroWebhookFallos = quedan - 1;
  throw new Error("fallo de prueba inyectado por el arnés (047)");
}
