# E2E — Pulir el borrador del operador (`/api/inbox/compose-assist`)

Precondición: app corriendo con mocks (`WA_MOCK_ENABLED=true`,
`OPENROUTER_BASE_URL` → ai-mock), organización creada, sesión de operador y una
conversación con la ventana de 24 h abierta.

Esto NO es un turno del agente: es una ayuda de redacción para el humano que
está escribiendo. El agente in-process puede estar apagado y la función sigue
teniendo sentido.

## Lo que hace

1. En la bandeja, abrir una conversación y escribir en el compositor un
   borrador con faltas: `oye si tenemos stock, te lo mando el jueve`.
2. La varita del compositor está **activa** (con el campo vacío está en gris).
3. Pulsarla → el texto del campo se reemplaza por la versión pulida:
   mayúscula inicial, acentos y puntuación corregidos, mismo contenido.
4. Aparece **"Deshacer pulido"** bajo el compositor.
5. Pulsar "Deshacer pulido" → vuelve el borrador original y el enlace
   desaparece.
6. Volver a escribir a mano → el enlace de deshacer desaparece (el borrador
   previo ya no es relevante).

## Las garantías duras

7. **No inventa.** El borrador no menciona precio ni moneda; el texto pulido
   tampoco puede traer `$`, `pesos`, `MXN` ni `USD`. El modelo no recibe la
   conversación ni la base de conocimiento justamente para que no tenga con
   qué fabricar datos.
8. **No envía.** Tras pulir, el hilo tiene los MISMOS mensajes que antes:
   `GET /api/conversations/{id}/messages` no crece. Es una propuesta, y el
   envío sigue siendo un acto explícito del operador.
9. **No despausa la IA.** `ai_enabled` y `handoff_at` de la conversación
   quedan como estaban: pulir no puede confundirse con un turno del agente.
10. **El borrador nunca se pierde.** Con el proveedor caído la llamada responde
    **503** `ai_unavailable` y el texto del operador sigue en el campo, intacto.

## Contrato de la superficie

11. `POST /api/inbox/compose-assist` sin sesión → **401**.
12. Con `{draft: "   "}` → **422**: un borrador vacío se rechaza antes de
    gastar una llamada al proveedor.
13. Con más de 4000 caracteres → **422**: es un mensaje de WhatsApp, no un
    documento.
14. Sin proveedor de IA configurado (`OPENROUTER_API_TOKEN` ausente) → la
    varita **no se dibuja** en el compositor, y la ruta responde **503**
    `ai_not_configured`. Un botón que solo sabe fallar es peor que no tenerlo.

## Automatizado

Los puntos 7, 8, 11 y 12 los conduce `scripts/e2e-selftest.mjs`
(`pulirBorradorChecks`). El resto —los del navegador— se verifican a mano
siguiendo este guion.
