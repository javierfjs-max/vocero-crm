/**
 * Estado en memoria del harness wa-mock (solo dev/test). Vive en globalThis
 * porque Next recarga módulos en dev; una instancia = un proceso, así que el
 * outbox en memoria es suficiente para las aserciones del self-test.
 */

export type OutboxEntry = {
  n: number;
  phoneNumberId: string;
  to: string;
  type: string;
  body: unknown;
  at: string;
  /**
   * Id que se le devolvió al CRM. Lo expone el outbox para que un self-test
   * pueda mandarle un webhook de estado a ESE mensaje sin adivinar el formato.
   */
  waMessageId?: string;
};

export type MockTemplate = {
  id: string;
  name: string;
  language: string;
  category: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  body: string;
  /** Componentes tal cual los mandó el CRM: Meta valida aquí los `example`. */
  components?: unknown[];
};

type WaMockState = {
  outbox: OutboxEntry[];
  templates: MockTemplate[];
  counter: number;
  seal: string;
};

const globalForMock = globalThis as unknown as { __waMockState?: WaMockState };

function newSeal(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function getWaMockState(): WaMockState {
  if (!globalForMock.__waMockState) {
    globalForMock.__waMockState = {
      outbox: [],
      templates: [],
      counter: 0,
      seal: newSeal(),
    };
  }
  // Estado creado por una versión del módulo sin sello (dev recarga módulos).
  if (!globalForMock.__waMockState.seal) {
    globalForMock.__waMockState.seal = newSeal();
  }
  return globalForMock.__waMockState;
}

export function resetWaMockState(): void {
  globalForMock.__waMockState = {
    outbox: [],
    templates: [],
    counter: 0,
    seal: newSeal(),
  };
}

export function nextN(): number {
  return ++getWaMockState().counter;
}

/**
 * El sello vive en el estado y se REGENERA en cada reset: si fuera constante
 * de módulo, vaciar el outbox (reset del contador) o reiniciar `pnpm dev`
 * re-emitiría un wamid ya usado, que choca con el UNIQUE de `wa_message_id`
 * en la BD de una corrida anterior — 500 al enviar, y en entrantes el mensaje
 * se dedupe y desaparece en silencio. No es un fallo del producto: la
 * idempotencia hace su trabajo.
 */
export function nextWamid(kind: "out" | "in" | "echo"): string {
  const state = getWaMockState();
  return `wamid.mock.${kind}.${state.seal}.${++state.counter}`;
}

export function nextOutboundWamid(): string {
  return nextWamid("out");
}
