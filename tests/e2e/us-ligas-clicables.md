# Ligas clicables en los mensajes (spec 040)

Automatizado: `node --env-file=.env scripts/e2e-ligas-clicables.mjs`, con la
app viva, `WA_MOCK_ENABLED=true` y `META_GRAPH_BASE_URL` apuntando a wa-mock.

## Guion

1. Llega un mensaje del cliente con una URL seguida de un punto. **Esperado:**
   la URL es un enlace (sin el punto), el texto alrededor no cambia.
2. Clic en la liga. **Esperado:** se abre en una pestaña nueva, sin `opener`
   ni `referer`; la bandeja se queda en la conversación.
3. Llega una imagen cuyo pie trae una URL entre paréntesis. **Esperado:** la
   URL del pie es un enlace y el paréntesis de cierre queda fuera.
4. Llega un mensaje con `javascript:` y `mailto:`. **Esperado:** ningún
   enlace.
5. El operador escribe una liga que empieza con `www.`. **Esperado:** en su
   burbuja es un enlace a `https://www.…`.
6. Recargar. **Esperado:** las ligas siguen ahí.

## Fuera del guion

- Las reglas finas (paréntesis internos, comillas, varias ligas, mayúsculas)
  están en `tests/unit/linkify.test.ts`.
