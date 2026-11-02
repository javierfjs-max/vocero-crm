/**
 * 042 — Qué imagen acepta el compositor cuando llega del portapapeles (y, 043,
 * de un arrastre): una sola, JPEG/PNG/WebP, hasta 5 MB. Son los límites de
 * imagen de la Cloud API, los mismos que `MEDIA_LIMITS.image` del servidor
 * (una prueba los ata); aquí se adelantan para no subir algo que se va a
 * rechazar ni pisar el adjunto que ya estaba.
 */
export const IMAGEN_ADJUNTA = {
  maxBytes: 5 * 1024 * 1024,
  mimes: /^image\/(jpeg|png|webp)$/,
} as const;

export type OrigenImagen = "paste" | "drop";

/** El archivo si sirve, o el motivo en palabras del operador. */
export function validarImagenAdjunta(
  files: readonly File[],
  origen: OrigenImagen
): { ok: true; file: File } | { ok: false; error: string } {
  const verbo = origen === "paste" ? "Pega" : "Arrastra";
  if (files.length !== 1) return { ok: false, error: `${verbo} una imagen a la vez.` };
  const file = files[0]!;
  if (!IMAGEN_ADJUNTA.mimes.test(file.type)) {
    return { ok: false, error: `${verbo} una imagen JPEG, PNG o WebP.` };
  }
  if (file.size > IMAGEN_ADJUNTA.maxBytes) {
    return { ok: false, error: "La imagen pasa del límite de 5 MB de WhatsApp." };
  }
  return { ok: true, file };
}
