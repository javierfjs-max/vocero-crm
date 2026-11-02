import { describe, expect, it } from "vitest";
import { etiquetaVence, POR_VENCER_MS, porVencer } from "@/lib/filtros-bandeja";

/** 052 — El filtro «Por vencer» y el aviso «Vence en…» de la fila. */

const H = 3_600_000;
const c = (windowOpen: boolean, windowRemainingMs: number) => ({ windowOpen, windowRemainingMs });

describe("por vencer", () => {
  it("ventana abierta con 2 h o menos", () => {
    expect(porVencer(c(true, 90 * 60_000))).toBe(true);
    expect(porVencer(c(true, POR_VENCER_MS))).toBe(true);
    expect(porVencer(c(true, POR_VENCER_MS + 1))).toBe(false);
    expect(porVencer(c(true, 23 * H))).toBe(false);
  });

  it("una ventana ya cerrada no está «por vencer»", () => {
    expect(porVencer(c(false, 0))).toBe(false);
    expect(porVencer(c(true, 0))).toBe(false);
  });
});

describe("el chip «Vence en…»", () => {
  it("horas y minutos, sin ceros de más", () => {
    expect(etiquetaVence(80 * 60_000)).toBe("Vence en 1 h 20 min");
    expect(etiquetaVence(2 * H)).toBe("Vence en 2 h");
    expect(etiquetaVence(45 * 60_000 + 30_000)).toBe("Vence en 45 min");
    expect(etiquetaVence(20_000)).toBe("Vence en menos de 1 min");
  });
});
