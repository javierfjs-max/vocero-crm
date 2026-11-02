# E2E — f01 Asistente del asesor

Precondiciones: app con mocks (`WA_MOCK_ENABLED=true`, `OPENROUTER_BASE_URL`
→ `/api/dev/ai-mock`), sesión iniciada, una conversación de WhatsApp con un
mensaje del cliente hace menos de 24 h. El ai-mock responde según la marca
`[ASISTENTE-ASESOR:<modo>]` (`src/server/dev/ai-mock.ts`).

## Fase 1 — redacción

1. En la Bandeja, abrir la conversación y escribir `hola como estas` en la caja.
2. Pulsar ✨ (o **Alt+A**). El menú muestra el grupo «Redacción» habilitado.
3. Elegir «Corregir ortografía».
   - Esperado: la caja dice `[ortografia] hola como estas` y bajo ella aparece
     «Deshacer cambio del asistente».
4. Pulsar «Deshacer cambio del asistente».
   - Esperado: la caja vuelve a `hola como estas` exacto.
5. Elegir «Tono casual».
   - Esperado: `[tono-casual] hola como estas`.
6. Escribir una letra.
   - Esperado: desaparece «Deshacer».
7. **Camino infeliz:** borrar todo, escribir `prueba falla_proveedor` y elegir
   «Pulir redacción».
   - Esperado: error rojo «La IA no respondió. Tu texto quedó intacto.» y la
     caja sigue con `prueba falla_proveedor`.
8. Con la caja vacía, abrir el menú.
   - Esperado: «Redacción · escribe algo primero» y sus opciones
     deshabilitadas; las de «Sugerir» siguen habilitadas.
9. Escape cierra el menú y el foco vuelve a la caja.

## Fase 2 — sugerencias

10. Con la caja vacía, «Sugerir respuesta».
    - Esperado: panel con dos tarjetas («Directo», «Con pregunta»); la
      segunda avisa «Completa lo que está entre [corchetes]».
11. «Usar» en la primera.
    - Esperado: la caja dice `[respuesta] Claro, con gusto te ayudo.` y se
      ofrece «Deshacer». No se envió nada (el hilo no cambió).
12. «Sugerir seguimiento».
    - Esperado: tarjetas con `[seguimiento] …`.
13. **Ventana cerrada:** en una conversación con el último mensaje del
    cliente hace más de 24 h y al menos una plantilla aprobada, pulsar
    «¿Qué plantilla le mando?» sobre el selector de plantillas.
    - Esperado: «Usa «<nombre de la primera plantilla>».» con su porqué.
14. **Sin plantillas aprobadas** en esa misma situación.
    - Esperado: error «La ventana está cerrada y no hay plantillas aprobadas…».
15. **Camino infeliz:** que el último mensaje del cliente contenga
    `falla_proveedor` y pedir «Sugerir respuesta».
    - Esperado: error «La IA no respondió. Vuelve a intentarlo.»; la caja no
      cambia.

## Fase 3 — técnica de venta

16. «Técnica de venta».
    - Esperado: panel «Técnica de venta» con «Cierre por alternativa», el
      momento, el porqué y el ejemplo `¿Te queda mejor el martes o el jueves?`.
17. «Usar ejemplo».
    - Esperado: el ejemplo queda en la caja con «Deshacer».

## Sin IA

18. Sin Ajustes → IA ni `OPENROUTER_*`: el botón ✨ no aparece, ni
    «¿Qué plantilla le mando?».
