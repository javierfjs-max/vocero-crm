import { describe, expect, it } from "vitest";
import { tituloConNoLeidos } from "@/components/avisos-de-mensajes";

/** 045 — El contador de la pestaña, como «(3) WhatsApp». */
describe("tituloConNoLeidos", () => {
  it("antepone los chats sin leer", () => {
    expect(tituloConNoLeidos("Vocero — CRM", 3)).toBe("(3) Vocero — CRM");
  });
  it("sin pendientes deja el título limpio", () => {
    expect(tituloConNoLeidos("(3) Vocero — CRM", 0)).toBe("Vocero — CRM");
  });
  it("no apila contadores al actualizar", () => {
    expect(tituloConNoLeidos("(3) Vocero — CRM", 5)).toBe("(5) Vocero — CRM");
  });
  it("más de 99 se muestra como 99+", () => {
    expect(tituloConNoLeidos("Vocero", 140)).toBe("(99+) Vocero");
    expect(tituloConNoLeidos("(99+) Vocero", 2)).toBe("(2) Vocero");
  });
});
