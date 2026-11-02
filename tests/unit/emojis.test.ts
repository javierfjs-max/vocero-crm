import { describe, expect, it } from "vitest";
import {
  EMOJIS,
  EMOJI_CATEGORIES,
  emojiSearchText,
  filterEmojis,
  insertAtSelection,
} from "@/lib/emojis";

const labels = (list: readonly { label: string }[]) => list.map((e) => e.label);

describe("041 — catálogo de emojis", () => {
  it("cada emoji aparece una sola vez, con nombre y en una categoría que existe", () => {
    const values = EMOJIS.map((e) => e.value);
    expect(new Set(values).size).toBe(values.length);
    const ids = new Set<string>(EMOJI_CATEGORIES.map((c) => c.id));
    for (const emoji of EMOJIS) {
      expect(emoji.label.trim()).not.toBe("");
      expect(ids.has(emoji.category)).toBe(true);
    }
  });

  it("los nombres no se repiten: el nombre accesible identifica al botón", () => {
    const names = EMOJIS.map((e) => e.label);
    expect(new Set(names).size).toBe(names.length);
  });

  it("todas las categorías tienen emojis", () => {
    for (const { id } of EMOJI_CATEGORIES) {
      expect(EMOJIS.some((e) => e.category === id)).toBe(true);
    }
  });

  it("es solo texto: ningún valor parece una URL o una ruta", () => {
    for (const { value } of EMOJIS) expect(value).not.toMatch(/[/:.<>]|^[\w\s]+$/);
  });
});

describe("041 — búsqueda", () => {
  it("no distingue acentos ni mayúsculas", () => {
    expect(emojiSearchText("Corazón ROJO")).toBe("corazon rojo");
    expect(labels(filterEmojis("corazon rojo", "all"))).toEqual(["Corazón rojo"]);
    expect(labels(filterEmojis("  CORAZÓN EN LLAMAS ", "all"))).toEqual(["Corazón en llamas"]);
  });

  it("busca en todo el catálogo aunque haya una categoría elegida", () => {
    const found = filterEmojis("sonrisa", "food");
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((e) => e.category === "faces")).toBe(true);
  });

  it("sin búsqueda enseña la categoría, o todo con «all»", () => {
    expect(filterEmojis("", "hearts").every((e) => e.category === "hearts")).toBe(true);
    expect(filterEmojis("   ", "all")).toHaveLength(EMOJIS.length);
  });

  it("encuentra por el propio emoji pegado en la búsqueda", () => {
    expect(labels(filterEmojis("👍", "all"))).toEqual(["Pulgar arriba"]);
  });

  it("sin coincidencias devuelve una lista vacía", () => {
    expect(filterEmojis("emojisincoincidencias", "all")).toEqual([]);
  });
});

describe("041 — insertar en el cursor", () => {
  it("inserta en el cursor y deja el cursor detrás del emoji", () => {
    expect(insertAtSelection("Hola mundo", 4, 4, "😀")).toEqual({ text: "Hola😀 mundo", caret: 6 });
  });

  it("reemplaza solo la selección y conserva lo de antes y lo de después", () => {
    expect(insertAtSelection("Hola mundo, gracias", 5, 10, "❤️‍🔥")).toEqual({
      text: "Hola ❤️‍🔥, gracias",
      caret: 5 + "❤️‍🔥".length,
    });
  });

  it("con el texto vacío o el cursor al final, añade al final", () => {
    expect(insertAtSelection("", 0, 0, "👋")).toEqual({ text: "👋", caret: 2 });
    expect(insertAtSelection("Listo", 5, 5, "✅")).toEqual({ text: "Listo✅", caret: 6 });
  });

  it("aguanta una selección al revés o fuera de rango", () => {
    expect(insertAtSelection("abcdef", 4, 2, "-")).toEqual({ text: "ab-ef", caret: 3 });
    expect(insertAtSelection("abc", 10, 12, "!")).toEqual({ text: "abc!", caret: 4 });
  });

  it("reemplazar un emoji por el mismo deja el texto igual", () => {
    const r = insertAtSelection("A😀B", 1, 3, "😀");
    expect(r).toEqual({ text: "A😀B", caret: 3 });
  });

  it("varias inserciones seguidas se acumulan en orden", () => {
    let state = { text: "Hola ", caret: 5 };
    for (const e of ["🎉", "🎉", "👏"]) state = insertAtSelection(state.text, state.caret, state.caret, e);
    expect(state.text).toBe("Hola 🎉🎉👏");
  });
});
