# 039 — Plan

Spec: [spec.md](spec.md).

## Constitution Check (antes de la Fase 0)

Sin violaciones: migración aditiva, DTO aditivo, sin terceros.

## Fase 0 — Lo que se investigó

| Pregunta | Respuesta |
|---|---|
| ¿El webhook ya trae la cita? | Sí: `WebhookMessage.context?: { from, id }` ya estaba tipado (`src/server/inbox/webhook.ts`) pero nadie lo leía |
| ¿Cómo se cita al enviar en WhatsApp? | `context: { message_id: <wamid> }` en el mismo cuerpo de `/<PHONE_NUMBER_ID>/messages`. Vale para cualquier tipo salvo reacciones; con plantillas la burbuja no se dibuja |
| ¿Zernio cita en Instagram/Messenger? | `replyTo` existe en su envío, pero su doc dice que en Instagram y Messenger se ignora (aviso `ignored_field`) |
| ¿Y Meta directo? | Instagram: `reply_to: { mid }` solo documentado con token de página (`graph.facebook.com`); Vocero usa Instagram Login. Messenger: documentado desde el 15-jul-2025 |
| ¿Dónde se serializa el mensaje? | `serializeMessage` (`src/server/inbox/ingest.ts`): lo usan el GET del hilo, `persistOutbound`, la ingesta, los ecos y `sendTemplate` |
| ¿Cómo sabe la UI qué ofrece el compositor? | `conversation.composer` (`queries.ts`), derivado de las capacidades del canal (028) |

## Fase 1 — Diseño

### Datos

1. `src/lib/db/schema.ts`: `message.replyToWaMessageId` → `reply_to_wa_message_id text`.
2. `pnpm db:generate` → `drizzle/0022_*.sql` (un `ALTER TABLE … ADD COLUMN`).
   Se edita para usar `ADD COLUMN IF NOT EXISTS` (re-ejecutable).

### Servidor

1. `src/server/inbox/quotes.ts` (nuevo):
   - `citaDelWebhook(msg)` — pura: `context.id` recortado o `null`.
   - `conCita(payload, wamid)` — pura: agrega `context` solo si hay `wamid`.
   - `resolverCitas(organizationId, mensajes)` — un query por lote; devuelve
     un `Map<wamid, { message, media }>`.
   - `aCitaDto(wamid, encontrado)` — arma `replyTo` (texto recortado a 200).
2. `serializeMessage(m, media, cita?)` gana `quotable` y `replyTo`.
3. `ingest.ts`: `ingestInboundMessage` recibe `replyToWaMessageId`;
   `processMessagesValue` y `ingestManualEcho` lo sacan con `citaDelWebhook`.
   Al publicar por SSE se resuelve la cita (un query, solo si hay).
4. `send.ts`:
   - `SendError` gana el código `reply_unavailable`.
   - `resolverMensajeCitado(target, replyToMessageId)` — valida conversación,
     organización, `wa_message_id` y capacidad; devuelve la fila citada.
   - `sendText`, `sendMediaMessage`, `sendStructured` aceptan
     `replyToMessageId`, pasan el payload por `conCita` y guardan la cita en
     `persistOutbound`, que la publica ya resuelta.
5. Rutas: `replyToMessageId` en el esquema de `…/messages` y como campo del
   formulario de `…/messages/media`; `reply_unavailable` → 422.
6. `capabilities.ts`: `quoteReplies` (solo WhatsApp); `queries.ts`:
   `composer.quoteReply`.

### UI

1. `src/lib/types.ts`: `MessageDto.quotable`, `MessageDto.replyTo`,
   `ConversationDto.composer.quoteReply`.
2. `message-thread.tsx`: botón «Responder» por burbuja (visible al pasar el
   ratón y siempre accesible por teclado) si `onReply` existe y
   `m.quotable`; bloque de cita arriba de la burbuja; clic → `scrollIntoView`
   del original (`data-message-id`) y resaltado breve.
3. `composer.tsx`: barra de vista previa con X; manda `replyToMessageId` en
   texto, adjunto, ubicación y contacto; se limpia al enviar y vuelve si el
   envío falla.
4. `inbox-client.tsx`: estado `replyTo` (se borra al cambiar de
   conversación); `sendText(text, replyTo)`; la burbuja provisional ya lleva
   la cita.

## Pruebas

- Unit: `tests/unit/responder-citando.test.ts` — `citaDelWebhook`, `conCita`,
  ingesta con y sin `context` (DB simulada), payload de `sendText` y de
  `sendMediaMessage` con `context`, `reply_unavailable` (otra conversación,
  sin wamid, canal sin capacidad), y `aCitaDto`.
- E2E: `tests/e2e/us-responder-citando.md` (guion para Playwright con
  wa-mock).

## Constitution Check (después del diseño)

Sin cambios.
