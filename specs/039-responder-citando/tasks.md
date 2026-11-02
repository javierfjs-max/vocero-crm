# 039 — Tareas

- [x] T1 Spec, plan y tareas (antes del código)
- [x] T2 Columna `reply_to_wa_message_id` + migración aditiva (`drizzle/0022_responder_citando.sql`)
- [x] T3 `src/server/inbox/quotes.ts` y `serializeMessage` con `quotable`/`replyTo`
- [x] T4 Ingesta (mensajes y ecos) guarda `context.id`
- [x] T5 Envío con `context` (texto, adjunto, ubicación/contactos) + `reply_unavailable`
- [x] T6 Capacidad `quoteReplies` y `composer.quoteReply`
- [x] T7 UI: «Responder», vista previa en el compositor, cita en la burbuja con salto al original
- [x] T8 Unit `tests/unit/responder-citando.test.ts` (17); guion `tests/e2e/us-responder-citando.md` + `scripts/e2e-responder-citando.mjs` (wa-mock gana `replyTo` en el entrante simulado)
- [x] T9 Gates (`typecheck`, `lint`, `test`, `build`) en verde; E2E 21/21 contra la app viva con wa-mock y una BD desechable (2026-10-21)
- [ ] T10 En vivo: pendiente de decisión del responsable (ninguna instancia tocada)
