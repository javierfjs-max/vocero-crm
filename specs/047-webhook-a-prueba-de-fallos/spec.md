# 047 — Webhook a prueba de fallos

**Feature Branch**: `feat/047-webhook-a-prueba-de-fallos` (sobre `feat/046-referencias-2.2`, #146)

**Created**: 2026-10-23

**Status**: Especificada antes de escribir código. Implementada; gates, arnés E2E (32/32), self-test general (280/280) y capturas en claro y oscuro en verde.

**Input**: primera spec de la 2.2, elegida por Kevin el 2026-10-23 en
[046 research.md](../046-referencias-2.2/research.md). El estudio confirmó en
`main` (`9940226`) lo que el análisis del 12-oct había encontrado: el webhook
responde 200 y procesa en `after()`; si el procesamiento falla, solo queda una
línea en el log y nadie reenvía.

**Carril**: ciclo completo (Principio VI). Toca el modelo de datos (tabla
nueva) y un contrato publicado (el webhook de entrada deja de responder
«siempre 200»).

## Problema

1. **Un mensaje que falla al procesarse se pierde.** Las cuatro rutas de
   entrada (`/api/webhooks/{wa,ig,messenger,tiktok}/[token]`) acusan recibo
   con 200 y luego procesan en `after()`. Si `processMessagesValue` lanza —la
   base parpadea, un despliegue mata el proceso, un bug con un tipo de mensaje
   raro—, queda `console.error` y nada más. Meta y Zernio ya recibieron 200:
   no reenvían. El cliente escribió y la bandeja nunca lo supo.
2. **Un redespliegue a media ingesta pierde el evento sin dejar rastro.** El
   `after()` vive en la memoria del proceso. Si el contenedor se detiene con
   uno en curso, ni siquiera queda la línea del log.
3. **Nadie se entera.** No hay dónde ver que algo no entró, ni forma de
   recuperarlo sin pedirle al cliente que vuelva a escribir.

Para un CRM que se vende como «la vía oficial y seria», un mensaje perdido es
una venta perdida que nadie ve.

## Decisiones

**D1 — Guardar antes de acusar recibo.** Tras validar el token y la firma (las
mismas capas de hoy), la ruta guarda el evento tal como llegó en una tabla
nueva, `webhook_event`, y solo entonces responde 200. Si **no se pudo
guardar** —la base no responde—, responde **503**. Así reintenta quien
manda: Meta reintenta durante días y Zernio también. Es el único caso en que
la ruta deja de decir 200. Un cuerpo ilegible, un token malo o una firma mala
se responden como hoy.

**D2 — Procesar enseguida, reintentar después.** Recién guardado, el evento se
procesa en el mismo `after()` de hoy: en el caso normal no cambia nada para
quien mira la bandeja. Si el procesamiento lanza, el evento queda
**pendiente** con su error y su próxima hora. Un barrido dentro del proceso
lo vuelve a intentar: 30 s, 2 min, 10 min, 1 h y 6 h, seis intentos en
total. Va con una variación al azar, como el despacho, para que no
reintenten todos a la vez.

**D3 — El barrido corre siempre.** No depende del cerebro ni de ninguna
bandera: la ingesta es del núcleo. Arranca con el servidor (como el despacho)
y lo primero que hace es retomar lo que un reinicio dejó a medias. Un evento
que se estaba procesando cuando murió el proceso tiene una reserva que vence
y lo vuelve a tomar el siguiente barrido. Es el mismo patrón del outbox del
despacho (021): reclamar una fila es un `UPDATE` condicionado al estado y al
contador de intentos.

**D4 — Reprocesar es seguro por construcción.** La ingesta ya era idempotente
(Principio IV):

- los mensajes se deduplican por `wa_message_id`;
- los estados de entrega nunca retroceden;
- un anuncio de origen solo se registra una vez.

Reprocesar un evento en el que la mitad de los mensajes sí entró no duplica
nada: entra solo lo que faltaba. Además, el **mismo cuerpo entregado dos
veces se guarda una sola vez** (huella SHA-256 del cuerpo, única).

**D5 — Lo agotado se ve y se puede reintentar.** Tras el sexto intento el
evento queda **agotado**:

- Ajustes → WhatsApp muestra un aviso con cuántos hay, el último error (sin
  datos del cliente) y un botón **Reintentar**. El botón los devuelve a
  pendientes y los procesa ya. Solo lo ve quien configura (dueño o
  administrador).
- La misma tarjeta dice «Entregas al día» cuando no hay pendientes ni
  agotados.
- `/api/health` gana la llave `webhooks: { pendientes, agotados }`. Agregar
  una llave cabe en el contrato; `ok` no cambia.

**D6 — La organización se resuelve al recibir.** Cada fila lleva
`organization_id` NOT NULL (Principio III). La ruta lo resuelve con lo que ya
usa la ingesta:

| Canal | Cómo se resuelve |
|---|---|
| WhatsApp | `phone_number_id` |
| Instagram de Meta | el id de la cuenta |
| Messenger de Meta | el id de la página |
| Zernio | la cuenta conectada |

Si no se resuelve, ese evento no tiene a quién ir. Hoy la ingesta lo descarta
con un aviso en el log, y eso no cambia: se procesa como hoy, sin guardarlo.

**D7 — No se guarda lo que no hace falta, ni más tiempo del necesario.** El
cuerpo trae datos del cliente (nombre, teléfono, texto). Por eso:

- se borra a los **7 días** de procesado y a los **30** de agotado;
- el error que se guarda es el mensaje de la excepción, recortado, nunca el
  cuerpo;
- el log no imprime el cuerpo;
- la API de Ajustes devuelve conteos, horas y el último error, nunca el
  payload.

**D8 — Un mensaje recuperado entra cuando se recupera.** El hilo se ordena por
llegada al CRM (`created_at`), así que un mensaje que entra en el segundo
intento aparece después de los que llegaron entretanto. Llega como entrante
normal: cuenta como no leído, abre la ventana con su hora real de WhatsApp y,
si hay cerebro, se despacha. Reordenar el hilo por la hora del canal cambia
«sin responder» y la ráfaga del despacho (025): queda fuera de esta spec.

## Comportamiento observable y criterios de aceptación

- **AC1 — Camino feliz sin cambios.** Un mensaje de WhatsApp entra a la
  bandeja como hoy, la ruta responde 200 y el evento queda `procesado`.
- **AC2 — Fallo transitorio.** Si el procesamiento falla la primera vez y
  funciona después:
  - la ruta respondió 200;
  - el evento queda `pendiente` con su error y su próxima hora;
  - el barrido lo procesa al vencer;
  - el mensaje aparece en la bandeja una sola vez.
- **AC3 — No se pudo guardar.** Con la base caída, la ruta responde 503 y no
  procesa nada. Al volver la base, el reenvío de Meta entra normal.
- **AC4 — Duplicado.** El mismo cuerpo dos veces deja una fila y un solo
  mensaje.
- **AC5 — Agotado.**
  - Tras seis fallos el evento queda `agotado`.
  - Ajustes → WhatsApp lo muestra con su error y el botón Reintentar.
  - Al reintentar con el fallo ya corregido, el mensaje entra y el aviso
    desaparece.
  - `/api/health` cuenta el agotado mientras existe.
- **AC6 — Reinicio.** Un evento `en_proceso` con la reserva vencida (el
  proceso murió) lo retoma el siguiente barrido.
- **AC7 — Canales sociales.** Con `CHANNELS` encendido, Instagram, Messenger y
  TikTok (Meta o Zernio) guardan y reintentan igual.
- **AC8 — Organización desconocida.** Un evento cuyo número o cuenta no está
  conectado no se guarda y se descarta con el aviso de siempre.
- **AC9 — Limpieza.** El barrido borra los procesados de más de 7 días y los
  agotados de más de 30.
- **AC10 — Permisos.** Un miembro sin permiso de configurar recibe 403 al
  pedir el estado o reintentar.

## Qué NO se hace y por qué

- **No se responde 5xx cuando falla el procesamiento.** Se podría procesar
  dentro de la ruta y contestar 500 si falla, para que reintente Meta. Pero
  Zernio corta a los 5 s, Meta también tiene un límite, y una ingesta con
  adjuntos o una base lenta lo rebasa. Además, Meta desactiva los webhooks
  que fallan seguido. El 503 se reserva para «no lo pude guardar».
- **No se reordena el hilo por la hora del canal** (D8).
- **No hay cola externa ni proceso aparte.** Es una tabla y un temporizador
  dentro del proceso, como el despacho (Principio II).
- **No se reintenta lo que la ingesta ya decide descartar a propósito**: un
  tipo no soportado, un mensaje sin identidad, un echo malformado. Eso no es
  un fallo.
- **No se exponen los payloads en la interfaz.** Para depurar está la base;
  la pantalla solo dice cuántos, cuándo y por qué.

## Constitution Check

| Principio | Cómo se cumple |
|---|---|
| I · Seguridad | El cuerpo guardado no lleva credenciales (Meta no las manda en el webhook). Con datos del cliente: retención corta (D7), nunca a logs ni a la API. Solo quien configura ve el estado |
| II · Soberanía | Sin dependencias ni terceros nuevos. Sin colas externas |
| III · Multi-tenancy | `organization_id` NOT NULL; las lecturas de Ajustes pasan por `scoped()`. El barrido es del sistema y trabaja fila por fila con su organización |
| IV · Idempotencia | Huella única del cuerpo; reclamo condicionado; la ingesta ya deduplica por `wa_message_id` |
| V · Hecho | Unitarias del reintento y de la resolución; arnés E2E con fallo inyectado; los cuatro gates |
| VI · Specs | Ciclo completo: esta spec, `plan.md` y `tasks.md` antes del código |
| VII · Trazabilidad | D1 a D8; el cambio al contrato del webhook queda anotado en `specs/001-vocero-core/contracts/webhook.md` |
| VIII · Foco | Atender conversaciones de WhatsApp sin perder ninguna |
| IX · En vivo | Self-test con mocks: camino feliz, fallo inyectado, agotado y Reintentar en la interfaz |
