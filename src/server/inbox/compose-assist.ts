import { z } from "zod";
import type { ChatMessage } from "@/lib/ai";

/**
 * Pulido del borrador del operador humano (no del agente).
 *
 * Alcance DELIBERADAMENTE estrecho: ortografía, gramática y registro. No
 * redacta desde una nota, no consulta la base de conocimiento y no ve la
 * conversación. Esa frontera es la que hace la función segura: sin datos del
 * negocio a la vista, el modelo no tiene con qué inventar precios, horarios ni
 * promesas — el peor fallo posible es una reescritura fea, nunca una mentira
 * enviada a un cliente.
 *
 * Ampliarlo a "redactar desde una nota" o "responder con la KB" es otra
 * feature, con otro contrato y otras pruebas. No lo cuelgues de aquí.
 */

/**
 * Marca del prompt de pulido. Existe para que el ai-mock del self-test pueda
 * despachar esta petición sin adivinar por el texto del borrador, igual que
 * `JUDGE_MARKER` hace con el juez del Laboratorio.
 */
export const POLISH_MARKER = "[PULIR]";

/** Lo único que se le acepta al modelo. */
export const PolishedDraft = z.object({
  text: z.string().trim().min(1).max(4096),
});

export type PolishedDraft = z.infer<typeof PolishedDraft>;

/** Tope del borrador de entrada: un mensaje de WhatsApp, no un documento. */
export const MAX_DRAFT_CHARS = 4000;

export function buildPolishPrompt(input: {
  agentName: string;
  tone: string | null;
  draft: string;
}): ChatMessage[] {
  const tono = input.tone?.trim()
    ? `El tono de la marca es: ${input.tone.trim()}`
    : "No hay un tono configurado: usa un registro profesional y cercano.";

  return [
    {
      role: "system",
      content: [
        `${POLISH_MARKER} Corriges mensajes de WhatsApp que un agente humano de "${input.agentName}" está por enviarle a un cliente.`,
        "",
        "Tu ÚNICA tarea es pulir la forma. Reglas estrictas:",
        "1. Corrige ortografía, acentos, puntuación y gramática.",
        "2. Ajusta el registro al tono de la marca.",
        "3. NO agregues información que no esté en el borrador. Nada de precios, horarios, plazos, disponibilidad ni promesas nuevas.",
        "4. NO quites información que sí esté.",
        "5. NO respondas al cliente ni continúes la conversación: solo reescribes lo que ya redactó el humano.",
        "6. Conserva el idioma del borrador.",
        "7. Devuelve UN solo mensaje de WhatsApp: sin markdown, sin títulos, sin viñetas salvo que el borrador ya las tenga.",
        "8. No lo alargues: como mucho un 30% más que el original.",
        "9. Si el borrador ya está bien, devuélvelo tal cual.",
        "",
        tono,
        "",
        'Responde ÚNICAMENTE con este JSON: {"text": "<el mensaje pulido>"}',
      ].join("\n"),
    },
    {
      role: "user",
      content: input.draft,
    },
  ];
}
