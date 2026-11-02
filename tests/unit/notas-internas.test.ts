import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { intercalarNotas, puedeBorrarNota } from "@/lib/notas";
import { notaSchema } from "@/server/notas";

/**
 * 050 — Notas internas: el equipo anota dentro del hilo y el cliente nunca lo
 * ve. La garantía de fondo es que viven en su propia tabla y que nada de lo
 * que habla con Meta, con el cerebro o cuenta respuestas las lee.
 */

describe("intercalar notas entre mensajes", () => {
  const m = (t: string) => ({ createdAt: `2026-10-23T10:${t}:00.000Z` });
  const n = (id: string, t: string) => ({ id, createdAt: `2026-10-23T10:${t}:00.000Z` });

  it("cada nota va antes del primer mensaje posterior; las últimas, al final", () => {
    const mensajes = [m("00"), m("05"), m("10")];
    const r = intercalarNotas(mensajes, [n("b", "07"), n("a", "02"), n("z", "30")]);
    expect(r.antes.map((x) => x.map((y) => y.id))).toEqual([[], ["a"], ["b"]]);
    expect(r.alFinal.map((x) => x.id)).toEqual(["z"]);
  });

  it("con la misma hora que un mensaje, la nota va después (se escribió leyéndolo)", () => {
    const r = intercalarNotas([m("00"), m("05")], [n("a", "05")]);
    expect(r.antes.flat()).toEqual([]);
    expect(r.alFinal.map((x) => x.id)).toEqual(["a"]);
  });

  it("sin mensajes, todas al final y por hora", () => {
    const r = intercalarNotas([], [n("b", "09"), n("a", "01")]);
    expect(r.alFinal.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("quién borra una nota", () => {
  it("el autor, o quien configura", () => {
    expect(puedeBorrarNota("u1", "u1", false)).toBe(true);
    expect(puedeBorrarNota("u1", "u2", false)).toBe(false);
    expect(puedeBorrarNota("u1", "u2", true)).toBe(true);
    // Si la cuenta del autor ya no existe, solo quien configura.
    expect(puedeBorrarNota(null, "u2", false)).toBe(false);
    expect(puedeBorrarNota(null, "u2", true)).toBe(true);
  });
});

describe("validación", () => {
  it("texto de 1 a 4 096 caracteres, sin espacios a los lados", () => {
    expect(notaSchema.safeParse({ texto: "   " }).success).toBe(false);
    expect(notaSchema.safeParse({ texto: "x".repeat(4097) }).success).toBe(false);
    expect(notaSchema.safeParse({ texto: "  ofrécele 5 %  " }).data?.texto).toBe("ofrécele 5 %");
  });
});

describe("guardarraíl: las notas nunca llegan al cliente ni al cerebro", () => {
  function archivos(dir: string): string[] {
    const out: string[] = [];
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      if (statSync(full).isDirectory()) out.push(...archivos(full));
      else if (/\.tsx?$/.test(e)) out.push(full);
    }
    return out;
  }
  const raiz = join(process.cwd(), "src", "server");
  const vigilados = [
    ...["dispatch", "brains", "bot", "analytics", "lab"].flatMap((d) => archivos(join(raiz, d))),
    join(raiz, "inbox", "send.ts"),
    join(raiz, "inbox", "ingest.ts"),
    join(raiz, "inbox", "window.ts"),
    join(process.cwd(), "src", "lib", "meta", "client.ts"),
  ];

  it("envío, despacho, bot, Laboratorio, métricas y la ventana no mencionan las notas", () => {
    const culpables = vigilados.filter((f) =>
      /conversationNote|conversation_note|server\/notas/.test(readFileSync(f, "utf8"))
    );
    expect(culpables).toEqual([]);
  });
});
