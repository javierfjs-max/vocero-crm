import { splitLinks } from "@/lib/linkify";

/** 040 — Texto de un mensaje con sus URL clicables; abren en otra pestaña. */
export function LinkedText({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <>
      {splitLinks(text).map((part, i) =>
        part.type === "link" ? (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="break-all text-brand-ink underline underline-offset-2 hover:opacity-80"
          >
            {part.text}
          </a>
        ) : (
          part.text
        )
      )}
    </>
  );
}
