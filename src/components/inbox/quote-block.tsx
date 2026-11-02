"use client";

import type { QuotedMessageDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { textoDeCita } from "./helpers";

/**
 * 039 — El fragmento citado, como en WhatsApp: barra de acento a la
 * izquierda, quién lo escribió y dos renglones del texto. Con `onJump` y un
 * original que sí está en el CRM, es un botón que lleva hasta él.
 */
export function QuoteBlock({
  cita,
  contactName,
  onJump,
  className,
}: {
  cita: QuotedMessageDto;
  contactName: string;
  onJump?: (messageId: string) => void;
  className?: string;
}) {
  const autor =
    cita.direction === "in" ? contactName : cita.direction === "out" ? "Tú" : null;
  const contenido = (
    <>
      {autor && (
        <span
          className={cn(
            "block truncate text-[11.5px] font-semibold",
            cita.direction === "out" ? "text-brand-ink" : "text-info-text"
          )}
        >
          {autor}
        </span>
      )}
      <span
        className={cn(
          "line-clamp-2 whitespace-pre-wrap break-words text-[12.5px] text-text-2",
          !cita.id && "italic text-text-3"
        )}
      >
        {textoDeCita(cita)}
      </span>
    </>
  );
  const base = cn(
    "block w-full min-w-0 rounded-md border-l-[3px] bg-quote px-2 py-1 text-left",
    cita.direction === "out" ? "border-brand" : "border-info-text",
    className
  );

  if (onJump && cita.id) {
    const id = cita.id;
    return (
      <button
        type="button"
        data-quote-of={id}
        onClick={() => onJump(id)}
        title="Ir al mensaje citado"
        className={cn(base, "transition-colors hover:bg-quote-hover")}
      >
        {contenido}
      </button>
    );
  }
  return <span className={base}>{contenido}</span>;
}
