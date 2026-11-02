import { apiError, parseBody, withAuth } from "@/lib/api";
import { PeticionRedaccion, reescribirBorrador } from "@/server/asistente/redaccion";

export const dynamic = "force-dynamic";

/**
 * f01 — Reescribe el borrador del asesor (ortografía, pulido o tono). Devuelve
 * una PROPUESTA: no envía nada, no toca la conversación y no altera
 * `ai_enabled` ni `handoff_at`. El asesor sigue al mando.
 *
 * Cualquier fallo del proveedor sale como 503 tipado: el compositor conserva
 * el borrador intacto, que es lo único inaceptable de perder.
 */
export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, PeticionRedaccion);
  if (!body.ok) return body.response;

  const result = await reescribirBorrador(session.organizationId, body.data);
  if (result.ok) return Response.json({ text: result.text });

  if (result.error === "not_configured") {
    return apiError(503, "ai_not_configured", "La IA no está configurada (Ajustes → IA).");
  }
  console.error(`[asistente] fallo del proveedor: ${result.detail}`);
  return apiError(503, "ai_unavailable", "La IA no respondió. Tu texto quedó intacto.");
});
