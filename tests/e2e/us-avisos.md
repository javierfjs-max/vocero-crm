# Avisos de mensaje nuevo y compositor sin ubicación ni contacto (spec 045)

Automatizado: `node --env-file=.env scripts/e2e-avisos.mjs`, con la app viva,
`WA_MOCK_ENABLED=true` y `META_GRAPH_BASE_URL` apuntando a wa-mock. El arnés
reemplaza `AudioContext` antes de cargar la página y cuenta las notas que se
tocan (cada aviso son dos).

## Guion

1. Con dos chats sin leer, abrir la Bandeja. **Esperado:** la pestaña dice
   «(2) …». Abrir uno baja a «(1) …».
2. El compositor no ofrece ubicación ni contacto; el clip y los emojis siguen.
3. Llega un mensaje a otro chat. **Esperado:** suena una vez y la pestaña lo
   cuenta.
4. Llega un mensaje al chat que estás mirando (pestaña con foco).
   **Esperado:** no suena.
5. Llegan tres mensajes seguidos. **Esperado:** suena una sola vez.
6. Mandar un mensaje. **Esperado:** no suena.
7. Tocar la campana del menú. **Esperado:** «silenciado»; un mensaje nuevo no
   suena; al recargar sigue silenciado.
8. Ir a Pipeline. **Esperado:** la pestaña sigue contando y un mensaje nuevo
   suena también ahí.

9. Abrir una conversación corta con una foto que tarda en cargar.
   **Esperado:** queda en el último mensaje; también al ir a Pipeline y
   volver. Si subes a leer y el hilo crece, no te baja.

## Fuera del guion

- El formato del título tiene su unitaria (`tests/unit/avisos-de-mensajes.test.ts`).
- Oír el sonido de verdad: el arnés cuenta las notas, no las escucha. Una
  pasada con el `AudioContext` real de Chromium no deja errores en la página.
