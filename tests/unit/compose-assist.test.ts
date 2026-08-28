import { describe, expect, it } from "vitest";
import {
  buildPolishPrompt,
  MAX_DRAFT_CHARS,
  PolishedDraft,
} from "@/server/inbox/compose-assist";

/**
 * Pulido del borrador del operador. Lo que se prueba aquí no es la redacción
 * —eso lo decide el modelo— sino el CONTRATO: que el prompt le prohíba
 * explícitamente inventar, que el borrador viaje aparte de las instrucciones,
 * y que la salida se valide antes de llegar al compositor.
 */

describe("buildPolishPrompt", () => {
  const draft = "oye si tenemos stock, te lo mando el jueve";

  it("manda el borrador como turno del usuario, no incrustado en el sistema", () => {
    const messages = buildPolishPrompt({
      agentName: "Ferretería El Martillo",
      tone: "cercano y directo",
      draft,
    });
    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe("system");
    expect(messages[1]).toEqual({ role: "user", content: draft });
  });

  it("prohíbe agregar información — es lo único que no puede fallar", () => {
    const system = buildPolishPrompt({
      agentName: "Negocio",
      tone: null,
      draft,
    })[0]!.content;
    expect(system).toContain("NO agregues información");
    expect(system).toContain("NO quites información");
    expect(system).toContain("NO respondas al cliente");
  });

  it("usa el tono de la marca cuando existe", () => {
    const system = buildPolishPrompt({
      agentName: "Negocio",
      tone: "formal, de usted",
      draft,
    })[0]!.content;
    expect(system).toContain("formal, de usted");
  });

  it("sin tono configurado cae a un default, no deja el hueco vacío", () => {
    const system = buildPolishPrompt({ agentName: "Negocio", tone: null, draft })[0]!
      .content;
    expect(system).toContain("No hay un tono configurado");
    // Un tono en blanco cuenta como ausente.
    const blanco = buildPolishPrompt({
      agentName: "Negocio",
      tone: "   ",
      draft,
    })[0]!.content;
    expect(blanco).toContain("No hay un tono configurado");
  });

  it("lleva el nombre del agente al prompt", () => {
    const system = buildPolishPrompt({
      agentName: "Ferretería El Martillo",
      tone: null,
      draft,
    })[0]!.content;
    expect(system).toContain("Ferretería El Martillo");
  });
});

describe("PolishedDraft", () => {
  it("acepta un mensaje normal y le quita los bordes", () => {
    const parsed = PolishedDraft.parse({ text: "  Sí tenemos stock.  " });
    expect(parsed.text).toBe("Sí tenemos stock.");
  });

  it("rechaza vacío: devolver la nada borraría el borrador del operador", () => {
    expect(PolishedDraft.safeParse({ text: "" }).success).toBe(false);
    expect(PolishedDraft.safeParse({ text: "   " }).success).toBe(false);
  });

  it("rechaza lo que no es texto o no viene", () => {
    expect(PolishedDraft.safeParse({}).success).toBe(false);
    expect(PolishedDraft.safeParse({ text: 42 }).success).toBe(false);
    expect(PolishedDraft.safeParse({ text: null }).success).toBe(false);
  });

  it("corta una respuesta desbordada en vez de pasarla al compositor", () => {
    expect(PolishedDraft.safeParse({ text: "a".repeat(4097) }).success).toBe(false);
  });
});

describe("MAX_DRAFT_CHARS", () => {
  it("es un mensaje de WhatsApp, no un documento", () => {
    expect(MAX_DRAFT_CHARS).toBe(4000);
  });
});
