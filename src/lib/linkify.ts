/**
 * 040 — Parte un texto en tramos de texto y de liga, para pintar las URL de
 * un mensaje como enlaces (p. ej. la liga de un mapa con la dirección).
 * Solo reconoce `http(s)://` y `www.`: nunca otros esquemas, así que de un
 * mensaje del cliente no puede salir un `javascript:` clicable.
 */
export type LinkPart =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string };

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi;

// Puntuación que casi siempre cierra la frase y no la liga: «ver aquí: https://x.com/a.»
const TRAILING_PUNCT = /[.,;:!?¡¿'"»”’]+$/;

function trimUrl(raw: string): string {
  let url = raw.replace(TRAILING_PUNCT, "");
  // Un «)» final solo es de la liga si abre dentro de ella (Wikipedia, etc.).
  while (url.endsWith(")") && count(url, "(") < count(url, ")")) {
    url = url.slice(0, -1).replace(TRAILING_PUNCT, "");
  }
  return url;
}

function count(s: string, ch: string): number {
  return s.split(ch).length - 1;
}

export function splitLinks(text: string): LinkPart[] {
  const parts: LinkPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    const url = trimUrl(match[0]);
    // «www.» suelto, o un «https://» sin nada detrás, no es una liga.
    if (/^(?:https?:\/\/|www\.)$/i.test(url)) continue;
    if (start > last) parts.push({ type: "text", text: text.slice(last, start) });
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    parts.push({ type: "link", text: url, href });
    last = start + url.length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}
