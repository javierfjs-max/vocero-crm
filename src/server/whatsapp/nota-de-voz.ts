import { esWebm, webmAOgg, WebmOggError } from "@/lib/audio/webm-ogg";
import { MediaValidationError } from "@/server/whatsapp/media";

/** El único formato de nota de voz que acepta WhatsApp (Ogg con Opus, mono). */
export const MIME_NOTA_DE_VOZ = "audio/ogg; codecs=opus";

type Archivo = { data: Buffer; mimeType: string; fileName?: string };

function mimeBase(mime: string): string {
  return mime.split(";")[0]!.trim().toLowerCase();
}

/**
 * 044 — Deja un audio saliente como lo acepta WhatsApp.
 *
 * - Un WebM (lo que graban Chrome y Edge) se pasa a Ogg sin recodificar
 *   (`src/lib/audio/webm-ogg.ts`): WhatsApp no acepta WebM. Si no se puede,
 *   se rechaza con el motivo en vez de mandarlo como documento.
 * - `voz` (grabado en el compositor) solo se marca como nota de voz si el
 *   archivo final es Ogg: Safari graba en MP4/AAC, que sale como audio normal.
 */
export function prepararAudioSaliente(
  file: Archivo,
  voz: boolean
): { file: Archivo; voice: boolean } {
  let actual = file;
  const base = mimeBase(file.mimeType);
  if (base === "audio/webm" || (base.startsWith("audio/") && esWebm(file.data))) {
    try {
      actual = {
        data: Buffer.from(webmAOgg(new Uint8Array(file.data))),
        mimeType: MIME_NOTA_DE_VOZ,
        fileName: (file.fileName ?? "nota-de-voz").replace(/\.(webm|weba)$/i, "") + ".ogg",
      };
    } catch (err) {
      if (!(err instanceof WebmOggError)) throw err;
      throw new MediaValidationError(
        "unsupported_type",
        `No se pudo preparar el audio para WhatsApp (${err.message}). Vuelve a grabarlo o súbelo en MP3, M4A u OGG`
      );
    }
  }
  const voice = voz && mimeBase(actual.mimeType) === "audio/ogg";
  if (voice) actual = { ...actual, mimeType: MIME_NOTA_DE_VOZ };
  return { file: actual, voice };
}
