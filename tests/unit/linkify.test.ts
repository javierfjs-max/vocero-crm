import { describe, expect, it } from "vitest";
import { splitLinks } from "@/lib/linkify";

const links = (text: string) =>
  splitLinks(text).flatMap((p) => (p.type === "link" ? [p.href] : []));

describe("040 — splitLinks", () => {
  it("deja el texto sin ligas como un solo tramo", () => {
    expect(splitLinks("Lunes a sábado: 9:00 am a 7:00 pm")).toEqual([
      { type: "text", text: "Lunes a sábado: 9:00 am a 7:00 pm" },
    ]);
  });

  it("reconoce la liga de un mapa y conserva el texto alrededor", () => {
    const text = "Dirección:\n\nAv. Siempre Viva 742, Centro\nhttps://maps.example.com/abc123";
    expect(splitLinks(text)).toEqual([
      { type: "text", text: "Dirección:\n\nAv. Siempre Viva 742, Centro\n" },
      {
        type: "link",
        text: "https://maps.example.com/abc123",
        href: "https://maps.example.com/abc123",
      },
    ]);
  });

  it("conserva la ruta, los parámetros y el fragmento", () => {
    expect(links("Pago en línea: https://pagos.example.com/p/9?t=MTA2N&x=1#fin")).toEqual([
      "https://pagos.example.com/p/9?t=MTA2N&x=1#fin",
    ]);
  });

  it("no se come la puntuación ni el paréntesis que cierran la frase", () => {
    const parts = splitLinks("Aquí está (https://maps.example.com/abc).");
    expect(parts.map((p) => p.text)).toEqual(["Aquí está (", "https://maps.example.com/abc", ")."]);
    expect(links("¿Ya viste https://example.com/catalogo?")).toEqual(["https://example.com/catalogo"]);
    expect(links("«https://example.com/a»")).toEqual(["https://example.com/a"]);
  });

  it("respeta los paréntesis que son parte de la liga", () => {
    expect(links("https://es.wikipedia.org/wiki/Martillo_(herramienta)")).toEqual([
      "https://es.wikipedia.org/wiki/Martillo_(herramienta)",
    ]);
  });

  it("completa https:// en las ligas que empiezan con www.", () => {
    expect(links("entra a www.example.com, ahí está")).toEqual(["https://www.example.com"]);
    expect(splitLinks("www.example.com")[0]).toMatchObject({ text: "www.example.com" });
  });

  it("acepta HTTP y mayúsculas en el esquema", () => {
    expect(links("HTTPS://EXAMPLE.COM/A y http://example.com")).toEqual([
      "HTTPS://EXAMPLE.COM/A",
      "http://example.com",
    ]);
  });

  it("no convierte otros esquemas", () => {
    expect(links("javascript:alert(1) mailto:a@b.com ftp://x.com data:text/html,hola")).toEqual([]);
  });

  it("no toma un «www.» o un «https://» sueltos", () => {
    expect(links("escribe www. y luego https:// nada más")).toEqual([]);
    expect(splitLinks("escribe www. nada")).toEqual([{ type: "text", text: "escribe www. nada" }]);
  });

  it("no parte una palabra que contiene «www.» en medio", () => {
    expect(links("abcwww.example.com")).toEqual([]);
  });

  it("encuentra varias ligas en un mensaje y el texto entre ellas", () => {
    const parts = splitLinks("https://a.example.com y https://b.example.com/x");
    expect(parts.map((p) => p.type)).toEqual(["link", "text", "link"]);
    expect(links("https://a.example.com y https://b.example.com/x")).toEqual([
      "https://a.example.com",
      "https://b.example.com/x",
    ]);
  });

  it("une los tramos y devuelve exactamente el texto original", () => {
    const text = "Mira (https://example.com/a), www.example.org. Fin";
    expect(splitLinks(text).map((p) => p.text).join("")).toBe(text);
  });

  it("corta la liga en las comillas y los signos < >", () => {
    expect(links('<https://example.com/a> "https://example.com/b"')).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ]);
  });
});
