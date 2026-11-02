# 039 — Responder citando un mensaje

**Feature Branch**: `039-responder-citando`

**Created**: 2026-10-21

**Status**: Especificada antes de escribir código.

**Input**: un negocio en producción pidió poder contestar desde la bandeja a
un mensaje concreto, como en WhatsApp («responder» sobre la burbuja). Hoy el
CRM guarda el `wa_message_id` de cada mensaje, pero ni manda `context` al
enviar ni lee `context` en lo que entra: si el cliente cita una foto de un
producto y pregunta «¿y este en azul?», la bandeja enseña solo «¿y este en
azul?» y el operador no sabe de qué foto habla. La 003 (paridad de inbox) no
lo cubría. Es una función del núcleo, igual para toda instancia.

**Carril**: ciclo completo (Principio VI). Toca el modelo de datos (columna
nueva, aditiva y nullable) y amplía de forma aditiva el DTO del mensaje que
viaja por SSE (`message.new`). No cambia `/api/bot/*` ni el webhook público.
Plan en [plan.md](plan.md), tareas en [tasks.md](tasks.md).

## Historias

**H1 — El operador responde citando.** Sobre cualquier burbuja de una
conversación de WhatsApp aparece «Responder». Al elegirla, el compositor
enseña arriba la vista previa del mensaje citado (quién lo mandó y su texto,
o el tipo de adjunto), con una X para cancelar. Lo que envíe —texto, adjunto,
ubicación o contacto— le llega al cliente en WhatsApp como respuesta a ese
mensaje.

**H2 — La bandeja enseña lo que citó el cliente.** Cuando el cliente responde
en WhatsApp a un mensaje concreto, la burbuja trae arriba el fragmento citado.
Al hacer clic en el fragmento, el hilo se desplaza al original y lo resalta un
momento.

**H3 — Lo enviado como respuesta se ve igual.** Un mensaje que salió como
respuesta (desde la bandeja, o a mano desde la app de WhatsApp Business del
teléfono en coexistence) se pinta con su cita, también al recargar.

## Decisiones

**D1 — Se guarda la referencia de la plataforma, no el id local.** Columna
nueva `message.reply_to_wa_message_id` (`text`, nullable, sin FK). Lo que
manda Meta en `messages[].context.id` es un `wamid`, y el mensaje citado puede
no existir en el CRM (anterior a la instalación, o de un tipo que la ingesta
ignora). Guardar el `wamid` no pierde nada y no obliga a un orden de llegada.
Los mensajes existentes quedan con `null`: nada que migrar.

**D2 — Se resuelve al leer.** Al listar mensajes (y al publicar uno nuevo por
SSE) se busca, en un solo query por lote, el mensaje de la misma organización
con ese `wa_message_id` (ya tiene índice UNIQUE). Si existe, la cita trae su
id local, dirección, tipo, texto (recortado a 200 caracteres) y tipo de
adjunto. Si no existe, la cita viaja igual con `id: null` y la burbuja dice
«Mensaje no disponible»: el cliente sí citó algo, y callarlo sería mentir.

**D3 — DTO del mensaje, dos campos nuevos (aditivos):**
- `quotable: boolean` — el mensaje tiene id de plataforma y se le puede
  responder. Un saliente fallido o de pruebas no lo tiene.
- `replyTo: { id, direction, type, text, mediaKind } | null` — la cita
  resuelta (D2). `id`, `direction` y `type` son `null` si el original no
  está en el CRM.

**D4 — El envío recibe el id LOCAL del mensaje citado.** `POST
/api/conversations/[id]/messages` (texto, ubicación, contactos) acepta
`replyToMessageId` opcional; `POST …/messages/media` lo acepta como campo del
formulario. El servidor comprueba que el mensaje sea de esa misma
conversación y organización, que tenga `wa_message_id`, y que el canal admita
citas (D5); si no, 422 `reply_unavailable` con un motivo legible, **sin
enviar**. Mandarlo sin la cita en silencio haría creer al operador que el
cliente verá a qué responde. El payload a Graph lleva
`context: { message_id: <wamid> }` y el saliente guarda ese `wamid` en
`reply_to_wa_message_id`.

**D5 — Solo WhatsApp, por capacidad del canal.** Capacidad nueva
`quoteReplies` en `src/server/channels/capabilities.ts`; la conversación la
expone como `composer.quoteReply` y la UI no ofrece «Responder» si es
`false`. Lo que se verificó (2026-10-21):

| Canal / transporte | Documentación | Decisión |
|---|---|---|
| WhatsApp Cloud API | `context.message_id` en `/<PHONE_NUMBER_ID>/messages` (guía «Contextual replies»). Sirve para texto, adjuntos, ubicación y contactos; no para reacciones | **Sí** |
| Instagram y Messenger por Zernio | `POST /v1/inbox/conversations/{id}/messages` tiene `replyTo`, pero la propia doc dice que Instagram y Messenger **no** lo admiten: se envía sin cita y responde un aviso `ignored_field` | **No** |
| Instagram directo (`graph.instagram.com`, Instagram Login, que es el transporte de Vocero) | La guía de `reply_to: { mid }` solo documenta `graph.facebook.com` con token de página; nada para Instagram Login | **No** (no confirmado) |
| Messenger directo (`graph.facebook.com`) | `reply_to: { mid }` documentado en el changelog del Send API (15-jul-2025) | **No por ahora**: la capacidad es por canal, y el mismo canal por Zernio la ignora. Ver «Fuera de alcance» |
| TikTok (Zernio) | Sin soporte documentado | **No** |

**D6 — Plantillas: sin cita.** Meta dice que la burbuja contextual no aparece
cuando se responde con una plantilla. El selector de plantillas (ventana
cerrada) no ofrece responder, y `sendTemplate` no cambia.

**D7 — Lo que entra.** Mensajes del cliente: se guarda `context.id` si viene.
Esto incluye las respuestas a botones de una plantilla (Meta manda el `wamid`
de la plantilla en `context.id`): la burbuja cita la plantilla, que es
exactamente a lo que respondió. Ecos de coexistence (`smb_message_echoes`):
también, para que una respuesta citada que el dueño mandó desde el teléfono
se vea citada en la bandeja. `context.forwarded` y `referred_product` no son
citas y se ignoran.

**D8 — Un `context.id` que no es texto o viene vacío se ignora** (se guarda
`null`); jamás revienta el webhook.

**D9 — Ni la IA ni el cerebro citan.** El camino de `aiGenerated` y
`/api/bot/messages` no cambian. Abrirlo al cerebro es un cambio de contrato
publicado (OpenAPI) y va en su propia feature si se pide.

**D10 — Antigüedad.** Meta advierte que la burbuja puede no dibujarse si el
original tiene más de ~30 días (pasó a almacenamiento largo). El CRM no lo
bloquea: el envío sale igual y en la bandeja sí se ve la cita.

## Fuera de alcance

- Citas en Instagram, Messenger y TikTok (D5). Messenger directo sí lo admite
  en Meta: se puede habilitar como capacidad por transporte cuando una
  instancia lo use sin Zernio.
- Leer citas entrantes de Instagram/Messenger: Zernio dice que vienen en
  `message.metadata`, pero no documenta las llaves; sin un payload real no se
  adivina.
- Citar desde `/api/bot/messages` (D9) y desde plantillas (D6).
- Reacciones (Meta no las admite como respuesta contextual).

## Criterios de aceptación

- **AC1** — Ingesta: un mensaje del webhook con `context.id = W` guarda
  `reply_to_wa_message_id = W`; sin `context`, o con `context` sin `id`, queda
  `null`. Igual para un eco de coexistence. (Unit.)
- **AC2** — Envío: `sendText` con `replyToMessageId` de un mensaje con
  `wa_message_id = W` manda a Graph `context: { message_id: W }` y guarda `W`
  en el saliente; sin `replyToMessageId`, el payload no trae `context`. Igual
  para adjuntos y ubicación/contactos. (Unit.)
- **AC3** — Envío inválido: citar un mensaje de otra conversación, uno sin
  `wa_message_id`, o en un canal sin `quoteReplies` → `reply_unavailable` y
  Graph no se llama. (Unit.)
- **AC4** — Lectura: `GET /api/conversations/[id]/messages` trae `replyTo`
  resuelto para el que cita un mensaje existente, y `replyTo.id = null` para
  el que cita uno que no está. (Unit de la resolución.)
- **AC5** — UI: en una conversación de WhatsApp, «Responder» sobre una
  burbuja abre la vista previa en el compositor; la X la quita; al enviar, el
  mensaje sale con cita y aparece citado en el hilo. En Instagram/Messenger
  no aparece «Responder». Un clic en la cita desplaza al original. (E2E con
  wa-mock.)
- **AC6** — La migración es aditiva y re-ejecutable; una instancia con datos
  arranca sin tocar filas.
- **AC7** — Gates: `typecheck`, `lint`, `test`, `build` en verde.
- **AC8** — En vivo: pendiente. Esta rama no se despliega a ninguna instancia
  sin decisión del responsable. Queda «pendiente de verificación humana».

## Constitution Check

| Principio | Cómo se cumple |
|---|---|
| I Seguridad | Sin secretos nuevos; el id citado se valida contra la organización de la sesión |
| II Soberanía | Sin terceros nuevos: solo la Cloud API |
| III Multi-tenancy | La búsqueda del citado y la validación del envío pasan por `scoped()` / `organization_id` |
| IV Idempotencia | La columna se escribe en el mismo INSERT idempotente por `wa_message_id`; migración aditiva re-ejecutable |
| V Calidad verificable | Unit de ingesta y payload, E2E de la bandeja con wa-mock |
| VI Spec antes de código | Este documento |
| VII Trazabilidad | D5 deja escrito qué se verificó por canal y con qué fuente |
| VIII Foco vertical | Es la bandeja de WhatsApp: el núcleo |
| IX Hecho = probado en vivo | AC8, pendiente |
