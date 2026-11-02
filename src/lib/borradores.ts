/**
 * 051 — Borrador por conversación, en el navegador.
 *
 * Lo que alguien dejó escrito en una conversación vuelve al regresar a ella.
 * Vive en `localStorage` de ese navegador: no viaja al servidor ni a otra
 * persona. Se borra al enviar, al vaciar la caja, a los 7 días y al cerrar
 * sesión (una computadora compartida no debe guardar lo que otro escribió).
 *
 * Las funciones reciben el almacén para probarlas sin navegador; las de abajo
 * usan `window.localStorage` y nunca lanzan (modo privado estricto, cuota
 * llena: sin borradores, todo sigue igual).
 */

export type TipoBorrador = "responder" | "nota";
export type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

const PREFIJO = "vocero.borrador.";
export const CADUCIDAD_MS = 7 * 24 * 3_600_000;
/** Evento de la ventana con el que la lista se entera de un borrador nuevo. */
export const EVENTO_BORRADOR = "vocero:borrador";

export function claveBorrador(tipo: TipoBorrador, conversationId: string): string {
  return `${PREFIJO}${tipo}.${conversationId}`;
}

/** Pura (con el almacén inyectado): guarda, o borra si la caja quedó vacía. */
export function guardarEn(
  almacen: Almacen,
  tipo: TipoBorrador,
  conversationId: string,
  texto: string,
  ahora: number = Date.now()
): void {
  const clave = claveBorrador(tipo, conversationId);
  if (!texto.trim()) almacen.removeItem(clave);
  else almacen.setItem(clave, JSON.stringify({ t: ahora, texto }));
}

/** Pura: el borrador, o `""`. Uno de más de 7 días se elimina al leerlo. */
export function leerDe(
  almacen: Almacen,
  tipo: TipoBorrador,
  conversationId: string,
  ahora: number = Date.now()
): string {
  const clave = claveBorrador(tipo, conversationId);
  const crudo = almacen.getItem(clave);
  if (!crudo) return "";
  try {
    const { t, texto } = JSON.parse(crudo) as { t?: number; texto?: string };
    if (typeof texto !== "string" || typeof t !== "number" || ahora - t > CADUCIDAD_MS) {
      almacen.removeItem(clave);
      return "";
    }
    return texto;
  } catch {
    almacen.removeItem(clave);
    return "";
  }
}

/** Pura: borra todos los borradores de este navegador (al cerrar sesión). */
export function limpiarEn(almacen: Almacen): number {
  const claves: string[] = [];
  for (let i = 0; i < almacen.length; i++) {
    const k = almacen.key(i);
    if (k?.startsWith(PREFIJO)) claves.push(k);
  }
  for (const k of claves) almacen.removeItem(k);
  return claves.length;
}

function almacen(): Almacen | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function guardarBorrador(tipo: TipoBorrador, conversationId: string, texto: string): void {
  const a = almacen();
  if (!a) return;
  try {
    const antes = leerDe(a, tipo, conversationId);
    guardarEn(a, tipo, conversationId, texto);
    // Solo se avisa cuando cambia «hay borrador» o su texto: la lista no se
    // vuelve a pintar en cada tecla por nada.
    if (antes !== (texto.trim() ? texto : "")) {
      window.dispatchEvent(new CustomEvent(EVENTO_BORRADOR, { detail: { conversationId } }));
    }
  } catch {
    // Sin almacenamiento: sin borrador.
  }
}

export function leerBorrador(tipo: TipoBorrador, conversationId: string): string {
  const a = almacen();
  if (!a) return "";
  try {
    return leerDe(a, tipo, conversationId);
  } catch {
    return "";
  }
}

export function limpiarBorradores(): void {
  const a = almacen();
  if (!a) return;
  try {
    limpiarEn(a);
  } catch {
    // Nada que limpiar.
  }
}
