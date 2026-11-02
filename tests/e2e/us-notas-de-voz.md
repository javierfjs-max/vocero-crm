# Notas de voz (spec 044)

Automatizado: `node --env-file=.env scripts/e2e-notas-de-voz.mjs`, con la app
viva, `WA_MOCK_ENABLED=true` y `META_GRAPH_BASE_URL` apuntando a wa-mock. El
arnés abre Chromium con el micrófono falso (un tono), así que `MediaRecorder`
graba de verdad: lo que llega al wa-mock es lo que llegaría a Meta.

## Guion

1. Abrir una conversación con una nota de voz entrante. **Esperado:** el
   reproductor enseña «0:03» y la onda; la velocidad pasa 1× → 1.5× → 2×;
   reproducir avanza y pausar detiene.
2. Tocar la onda al 80 % y arrastrar hacia el inicio. **Esperado:** la
   posición va a 0:02 y luego a 0:00. Con el foco en la onda, Fin va al final
   y ← retrocede 5 s.
3. Con la caja vacía, el botón es el micrófono; al escribir, Enviar.
4. Grabar ~2.5 s, «Detener y escuchar». **Esperado:** la vista previa tiene su
   duración y se puede oír.
5. Enviar con la red fallando (502). **Esperado:** se dice el motivo y la
   nota sigue en la grabadora. Reintentar la manda: a Graph va `audio` con
   `voice: true`, y lo subido es Ogg (`OggS`, `audio/ogg; codecs=opus`,
   `.ogg`), aunque Chrome grabó WebM.
6. La nota aparece en el hilo con duración y una onda sacada del audio.
7. Grabar y enviar sin detener. **Esperado:** sale, también como nota de voz.
   Grabar y descartar. **Esperado:** no sale nada.
8. Con la conversación abierta, llega otro audio. **Esperado:** pasa de
   «descargando…» al reproductor sin recargar (D8).
9. Recargar. **Esperado:** los audios arrancan a la velocidad elegida (2×).
10. Con el micrófono bloqueado. **Esperado:** «Permite el micrófono en el
   navegador para grabar notas de voz.» y la caja sigue usable.

## Fuera del guion

- La conversión WebM → Ogg tiene su unitaria con una grabación real de
  Chromium (`tests/unit/webm-ogg.test.ts`), y la elección por navegador la
  suya (`tests/unit/nota-de-voz.test.ts`).
- Que la nota llegue al teléfono como nota de voz (con su botón de reproducir
  y la onda de WhatsApp) solo se ve con un número real.
- La transcripción la hace Nea (nea-agent `fix/modelo-que-oye`).
