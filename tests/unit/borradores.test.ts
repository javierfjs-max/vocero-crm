import { describe, expect, it } from "vitest";
import {
  CADUCIDAD_MS,
  claveBorrador,
  guardarEn,
  leerDe,
  limpiarEn,
  type Almacen,
} from "@/lib/borradores";

/** 051 — Borrador por conversación: guardar, leer, caducar y limpiar. */

function memoria(): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
    key: (i) => [...datos.keys()][i] ?? null,
    get length() {
      return datos.size;
    },
  };
}

describe("guardar y leer", () => {
  it("lo escrito en una conversación vuelve en esa, y no en otra", () => {
    const a = memoria();
    guardarEn(a, "responder", "cv_a", "Te confirmo mañana");
    expect(leerDe(a, "responder", "cv_a")).toBe("Te confirmo mañana");
    expect(leerDe(a, "responder", "cv_b")).toBe("");
  });

  it("la nota interna lleva su propio borrador", () => {
    const a = memoria();
    guardarEn(a, "responder", "cv_a", "para el cliente");
    guardarEn(a, "nota", "cv_a", "para el equipo");
    expect(leerDe(a, "responder", "cv_a")).toBe("para el cliente");
    expect(leerDe(a, "nota", "cv_a")).toBe("para el equipo");
  });

  it("vaciar la caja (o solo espacios) borra el borrador", () => {
    const a = memoria();
    guardarEn(a, "responder", "cv_a", "algo");
    guardarEn(a, "responder", "cv_a", "   ");
    expect(a.datos.has(claveBorrador("responder", "cv_a"))).toBe(false);
  });
});

describe("caducidad", () => {
  it("un borrador de más de 7 días no vuelve y se elimina", () => {
    const a = memoria();
    const hace = 1_000_000;
    guardarEn(a, "responder", "cv_a", "viejo", hace);
    expect(leerDe(a, "responder", "cv_a", hace + CADUCIDAD_MS - 1)).toBe("viejo");
    expect(leerDe(a, "responder", "cv_a", hace + CADUCIDAD_MS + 1)).toBe("");
    expect(a.datos.size).toBe(0);
  });

  it("un valor roto se descarta sin lanzar", () => {
    const a = memoria();
    a.setItem(claveBorrador("responder", "cv_a"), "{no es json");
    expect(leerDe(a, "responder", "cv_a")).toBe("");
    expect(a.datos.size).toBe(0);
  });
});

describe("cerrar sesión", () => {
  it("borra todos los borradores y nada más", () => {
    const a = memoria();
    guardarEn(a, "responder", "cv_a", "uno");
    guardarEn(a, "nota", "cv_b", "dos");
    a.setItem("vocero.sonido", "on");
    expect(limpiarEn(a)).toBe(2);
    expect([...a.datos.keys()]).toEqual(["vocero.sonido"]);
  });
});
