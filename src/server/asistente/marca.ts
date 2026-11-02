/**
 * f01 — Lo liviano del asistente del asesor: acciones, tonos y la marca del
 * prompt. Vive aparte de `redaccion.ts` para que el ai-mock lo importe sin
 * arrastrar la base ni el adaptador de IA.
 */

export const ACCIONES = ["ortografia", "pulir", "tono"] as const;
export type Accion = (typeof ACCIONES)[number];

export const TONOS = ["profesional", "casual", "calido", "breve"] as const;
export type Tono = (typeof TONOS)[number];

/**
 * Marca del prompt. Existe para que el ai-mock del self-test despache esta
 * petición sin adivinar por el texto, igual que `JUDGE_MARKER` con el juez.
 * La marca completa lleva el modo: `[ASISTENTE-ASESOR:tono-casual]`.
 */
export const ASISTENTE_MARKER = "[ASISTENTE-ASESOR:";

export function marcaDe(accion: Accion, tono?: Tono): string {
  return `${ASISTENTE_MARKER}${accion === "tono" ? `tono-${tono ?? "profesional"}` : accion}]`;
}
