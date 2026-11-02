import { beforeEach, describe, expect, it, vi } from "vitest";

/** f01 — La ruta del asistente: sesión, validación y fallos del proveedor. */
const mocks = vi.hoisted(() => ({ session: vi.fn(), reescribir: vi.fn() }));

vi.mock("@/lib/auth/session", async (original) => ({
  ...(await original<typeof import("@/lib/auth/session")>()),
  requireSession: mocks.session,
}));
vi.mock("@/server/asistente/redaccion", async (original) => ({
  ...(await original<typeof import("@/server/asistente/redaccion")>()),
  reescribirBorrador: mocks.reescribir,
}));

import { POST } from "@/app/api/inbox/asistente/route";
import { UnauthorizedError } from "@/lib/auth/session";

const pedir = (body: unknown) =>
  POST(
    new Request("http://localhost/api/inbox/asistente", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.session.mockResolvedValue({ organizationId: "org_a", role: "member" });
  mocks.reescribir.mockResolvedValue({ ok: true, text: "Hola, ¿cómo estás?" });
});

describe("f01 — POST /api/inbox/asistente", () => {
  it("cualquier rol recibe la propuesta, pagada por su organización", async () => {
    const res = await pedir({ accion: "ortografia", borrador: "hola como estas" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "Hola, ¿cómo estás?" });
    expect(mocks.reescribir).toHaveBeenCalledWith("org_a", {
      accion: "ortografia",
      borrador: "hola como estas",
    });
  });

  it("sin sesión es 401 y no se llama a la IA", async () => {
    mocks.session.mockRejectedValue(new UnauthorizedError());
    expect((await pedir({ accion: "pulir", borrador: "hola" })).status).toBe(401);
    expect(mocks.reescribir).not.toHaveBeenCalled();
  });

  it("un cuerpo inválido es 422 y no se llama a la IA", async () => {
    expect((await pedir({ accion: "tono", borrador: "hola" })).status).toBe(422);
    expect((await pedir({ accion: "pulir", borrador: "" })).status).toBe(422);
    expect(mocks.reescribir).not.toHaveBeenCalled();
  });

  it("sin IA configurada es 503 ai_not_configured", async () => {
    mocks.reescribir.mockResolvedValue({ ok: false, error: "not_configured", detail: "x" });
    const res = await pedir({ accion: "pulir", borrador: "hola" });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("ai_not_configured");
  });

  it("si el proveedor falla es 503 ai_unavailable y dice que el texto quedó intacto", async () => {
    mocks.reescribir.mockResolvedValue({ ok: false, error: "unavailable", detail: "timeout" });
    const res = await pedir({ accion: "tono", tono: "casual", borrador: "hola" });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("ai_unavailable");
    expect(body.error.message).toMatch(/intacto/);
  });
});
