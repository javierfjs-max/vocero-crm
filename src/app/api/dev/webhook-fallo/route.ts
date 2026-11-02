import { z } from "zod";
import { parseBody } from "@/lib/api";
import { mockGuard } from "@/lib/dev-guard";
import {
  fallosDePruebaPendientes,
  programarFallosDePrueba,
} from "@/server/dev/webhook-fallo";

export const dynamic = "force-dynamic";

/**
 * 047 — Solo con mocks: el arnés pide que los siguientes N procesamientos de
 * webhook lancen, para ver el reintento y el agotado. 404 en producción.
 */
export async function GET() {
  const guard = mockGuard();
  if (guard) return guard;
  return Response.json({ veces: fallosDePruebaPendientes() });
}

export async function POST(req: Request) {
  const guard = mockGuard();
  if (guard) return guard;
  const body = await parseBody(req, z.object({ veces: z.number().int().min(0).max(100) }));
  if (!body.ok) return body.response;
  programarFallosDePrueba(body.data.veces);
  return Response.json({ veces: fallosDePruebaPendientes() });
}
