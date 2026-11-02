import { apiError, parseBody, withAuth } from "@/lib/api";
import { PeticionSugerencia, sugerir } from "@/server/asistente/sugerencias";

export const dynamic = "force-dynamic";

/** Estado, código público (el mismo que la ruta de redacción) y mensaje. */
const CODIGOS = {
  not_found: [404, "not_found", "Conversación no encontrada."],
  sin_mensajes: [409, "sin_mensajes", "El cliente todavía no ha escrito nada: no hay a qué responder."],
  ventana_cerrada: [409, "ventana_cerrada", "La ventana para escribir está cerrada: no se puede enviar texto libre."],
  sin_plantillas: [409, "sin_plantillas", "La ventana está cerrada y no hay plantillas aprobadas para retomar la conversación."],
  not_configured: [503, "ai_not_configured", "La IA no está configurada (Ajustes → IA)."],
  unavailable: [503, "ai_unavailable", "La IA no respondió. Vuelve a intentarlo."],
} as const;

/**
 * f01 · fases 2 y 3 — Sugerencias que leen la conversación: responder,
 * dar seguimiento o qué técnica de venta aplicar. Solo PROPONE: no envía,
 * no mueve al lead de etapa y no toca `ai_enabled` ni `handoff_at`.
 */
export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, PeticionSugerencia);
  if (!body.ok) return body.response;

  const result = await sugerir(session.organizationId, body.data);
  if (result.ok) {
    switch (result.tipo) {
      case "sugerencias":
        return Response.json({ tipo: result.tipo, sugerencias: result.sugerencias });
      case "tecnica":
        return Response.json({ tipo: result.tipo, tecnica: result.tecnica });
      case "plantilla":
        return Response.json({ tipo: result.tipo, plantilla: result.plantilla });
    }
  }
  if (result.error === "unavailable") {
    console.error(`[asistente] fallo del proveedor: ${result.detail}`);
  }
  const [status, codigo, mensaje] = CODIGOS[result.error];
  return apiError(status, codigo, mensaje);
});
