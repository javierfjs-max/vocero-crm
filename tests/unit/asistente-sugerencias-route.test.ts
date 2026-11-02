import { beforeEach, describe, expect, it, vi } from "vitest";

/** f01 · fases 2 y 3 — La ruta de sugerencias: sesión, validación y cada rechazo. */
const mocks = vi.hoisted(() => ({ session: vi.fn(), sugerir: vi.fn() }));

vi.mock("@/lib/auth/session", async (original) => ({
  ...(await original<typeof import("@/lib/auth/session")>()),
  requireSession: mocks.session,
}));
vi.mock("@/server/asistente/sugerencias", async (original) => ({
  ...(await original<typeof import("@/server/asistente/sugerencias")>()),
  sugerir: mocks.sugerir,
}));

import { POST } from "@/app/api/inbox/asistente/sugerencias/route";
import { UnauthorizedError } from "@/lib/auth/session";

const pedir = (body: unknown) =>
  POST(
    new Request("http://localhost/api/inbox/asistente/sugerencias", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
const valida = { conversationId: "cv_1", accion: "respuesta" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.session.mockResolvedValue({ organizationId: "org_a", role: "member" });
});

describe("f01 — POST /api/inbox/asistente/sugerencias", () => {
  it("devuelve las sugerencias, buscadas en la organización de la sesión", async () => {
    mocks.sugerir.mockResolvedValue({
      ok: true,
      tipo: "sugerencias",
      sugerencias: [{ enfoque: "Directo", texto: "Hola" }],
    });
    const res = await pedir(valida);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tipo: "sugerencias", sugerencias: [{ enfoque: "Directo", texto: "Hola" }] });
    expect(mocks.sugerir).toHaveBeenCalledWith("org_a", valida);
  });

  it("devuelve la técnica y la plantilla con su tipo", async () => {
    const tecnica = { clave: "spin", nombre: "Preguntas SPIN", momento: "m", porque: "p", ejemplo: "e" };
    mocks.sugerir.mockResolvedValue({ ok: true, tipo: "tecnica", tecnica });
    expect(await (await pedir({ ...valida, accion: "tecnica" })).json()).toEqual({ tipo: "tecnica", tecnica });
    mocks.sugerir.mockResolvedValue({ ok: true, tipo: "plantilla", plantilla: { nombre: "x", porque: "y" } });
    expect(await (await pedir({ ...valida, accion: "seguimiento" })).json()).toEqual({
      tipo: "plantilla",
      plantilla: { nombre: "x", porque: "y" },
    });
  });

  it("sin sesión es 401; cuerpo inválido es 422; ninguno llama a la IA", async () => {
    mocks.session.mockRejectedValue(new UnauthorizedError());
    expect((await pedir(valida)).status).toBe(401);
    mocks.session.mockResolvedValue({ organizationId: "org_a", role: "member" });
    expect((await pedir({ accion: "respuesta" })).status).toBe(422);
    expect(mocks.sugerir).not.toHaveBeenCalled();
  });

  it.each([
    ["not_found", 404],
    ["sin_mensajes", 409],
    ["ventana_cerrada", 409],
    ["sin_plantillas", 409],
    ["not_configured", 503],
    ["unavailable", 503],
  ] as const)("%s responde %i con su código", async (error, status) => {
    mocks.sugerir.mockResolvedValue({ ok: false, error, detail: "x" });
    const res = await pedir(valida);
    expect(res.status).toBe(status);
    const body = await res.json();
    expect(body.error.code).toBe(error);
    expect(body.error.message.length).toBeGreaterThan(0);
  });
});
