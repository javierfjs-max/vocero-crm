import { describe, expect, it } from "vitest";
import {
  aplicarRespuesta,
  ATAJO_RE,
  filtrarRespuestas,
  normalizarAtajo,
  primerNombre,
  rellenarVariables,
  tokenRapido,
} from "@/lib/respuestas-rapidas";
import { respuestaSchema } from "@/server/quick-replies";

/** 049 — Respuestas rápidas: lo puro del menú «/» y la validación. */

describe("el atajo se guarda normalizado", () => {
  it("sin barra, sin acentos, en minúsculas y con guiones en vez de espacios", () => {
    expect(normalizarAtajo("/Envío")).toBe("envio");
    expect(normalizarAtajo("  Horario Fin de Semana ")).toBe("horario-fin-de-semana");
    expect(normalizarAtajo("pago_2026!")).toBe("pago_2026");
    expect(normalizarAtajo("x".repeat(50))).toHaveLength(32);
  });

  it("lo que no deja nada válido no pasa la validación", () => {
    expect(ATAJO_RE.test(normalizarAtajo("¡¡!!"))).toBe(false);
    expect(respuestaSchema.safeParse({ atajo: "///", texto: "hola" }).success).toBe(false);
    expect(respuestaSchema.safeParse({ atajo: "hola", texto: "   " }).success).toBe(false);
    expect(respuestaSchema.safeParse({ atajo: "Envío", texto: "x" }).data?.atajo).toBe("envio");
  });
});

describe("el token «/atajo» antes del cursor", () => {
  it("al inicio de la caja y después de un espacio", () => {
    expect(tokenRapido("/hor", 4)).toEqual({ inicio: 0, consulta: "hor" });
    expect(tokenRapido("Gracias /pa", 11)).toEqual({ inicio: 8, consulta: "pa" });
    expect(tokenRapido("/", 1)).toEqual({ inicio: 0, consulta: "" });
    expect(tokenRapido("hola\n/env", 9)).toEqual({ inicio: 5, consulta: "env" });
  });

  it("no abre con una barra pegada a otra cosa", () => {
    expect(tokenRapido("3/4", 3)).toBeNull();
    expect(tokenRapido("mira https://tienda.mx", 22)).toBeNull();
    expect(tokenRapido("y/o", 3)).toBeNull();
  });

  it("solo cuenta lo que hay antes del cursor", () => {
    expect(tokenRapido("/horario y algo", 8)).toEqual({ inicio: 0, consulta: "horario" });
    expect(tokenRapido("/horario y algo", 12)).toBeNull();
  });
});

describe("el filtro", () => {
  const lista = [
    { id: "1", atajo: "pago", texto: "Aceptamos transferencia" },
    { id: "2", atajo: "horario", texto: "Abrimos de lunes a sábado" },
    { id: "3", atajo: "envio", texto: "Envíos el mismo día" },
    { id: "4", atajo: "hola", texto: "¡Hola {nombre}!" },
  ];

  it("sin consulta, todas por atajo", () => {
    expect(filtrarRespuestas(lista, "").map((r) => r.atajo)).toEqual(["envio", "hola", "horario", "pago"]);
  });

  it("primero las que empiezan por la consulta, luego las que la contienen", () => {
    expect(filtrarRespuestas(lista, "ho").map((r) => r.atajo)).toEqual(["hola", "horario"]);
    // «sábado» está en el texto de horario: contiene, no empieza.
    expect(filtrarRespuestas(lista, "sabado").map((r) => r.atajo)).toEqual(["horario"]);
  });

  it("ignora acentos y mayúsculas", () => {
    expect(filtrarRespuestas(lista, "ENVÍ").map((r) => r.atajo)).toEqual(["envio"]);
  });
});

describe("{nombre}", () => {
  it("se cambia por el primer nombre", () => {
    expect(rellenarVariables("¡Hola {nombre}!", "María Fernanda López")).toBe("¡Hola María!");
    expect(rellenarVariables("Hola { Nombre }, gracias", "Ana")).toBe("Hola Ana, gracias");
  });

  it("sin nombre se quita con su espacio, sin dejar «Hola , …»", () => {
    expect(rellenarVariables("Hola {nombre}, ¿qué tal?", null)).toBe("Hola, ¿qué tal?");
    expect(rellenarVariables("¡Hola {nombre}!", "+52 55 1234 5678")).toBe("¡Hola!");
    expect(rellenarVariables("Hola {nombre}", "bsuid:MX.abc123")).toBe("Hola");
  });

  it("un teléfono o un BSUID no cuentan como nombre", () => {
    expect(primerNombre("5215512345678")).toBe("");
    expect(primerNombre("bsuid:MX.abc")).toBe("");
    expect(primerNombre("  José  Luis")).toBe("José");
  });
});

describe("reemplazar el token por la respuesta", () => {
  it("cambia de la barra al cursor y deja el cursor al final de lo insertado", () => {
    const r = aplicarRespuesta("Gracias /pa", 8, 11, "Aceptamos tarjeta.");
    expect(r).toEqual({ texto: "Gracias Aceptamos tarjeta.", cursor: 26 });
  });

  it("respeta lo que hay después del cursor", () => {
    const r = aplicarRespuesta("/hor y gracias", 0, 4, "Abrimos a las 8.");
    expect(r.texto).toBe("Abrimos a las 8. y gracias");
    expect(r.cursor).toBe(16);
  });
});
