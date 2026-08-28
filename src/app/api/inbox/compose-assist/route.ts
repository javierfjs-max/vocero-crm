import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { chatJson } from "@/lib/ai";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import {
  buildPolishPrompt,
  MAX_DRAFT_CHARS,
  PolishedDraft,
} from "@/server/inbox/compose-assist";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  draft: z.string().trim().min(1).max(MAX_DRAFT_CHARS),
});

/**
 * Pule el borrador del operador. Devuelve una PROPUESTA: no envía nada, no
 * toca la conversación y no altera `ai_enabled` ni `handoff_at` — el humano
 * sigue al mando y esto no puede confundirse con un turno del agente.
 *
 * Cualquier fallo del proveedor sale como 503 tipado: el front conserva el
 * borrador original intacto, que es lo único inaceptable de perder.
 */
export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, bodySchema);
  if (!body.ok) return body.response;

  const db = getDb();
  const rows = await db
    .select({
      name: schema.agentProfile.name,
      tone: schema.agentProfile.tone,
    })
    .from(schema.agentProfile)
    .where(scoped(schema.agentProfile.organizationId, session.organizationId))
    .limit(1);

  // Sin perfil configurado el pulido sigue teniendo sentido: se cae al tono
  // por defecto en vez de negarle la ayuda al operador.
  const profile = rows[0] ?? { name: "Asistente", tone: null };

  const result = await chatJson(
    PolishedDraft,
    buildPolishPrompt({
      agentName: profile.name,
      tone: profile.tone,
      draft: body.data.draft,
    }),
    { timeoutMs: 20_000 }
  );

  if (!result.ok) {
    if (result.error === "not_configured") {
      return apiError(503, "ai_not_configured", "La IA no está configurada");
    }
    console.error(`[compose-assist] fallo del proveedor: ${result.detail}`);
    return apiError(
      503,
      "ai_unavailable",
      "No se pudo pulir el borrador. Tu texto quedó intacto."
    );
  }

  return Response.json({ text: result.data.text });
});
