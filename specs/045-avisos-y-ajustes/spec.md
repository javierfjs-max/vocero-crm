# 045 — Avisos de mensaje nuevo y compositor sin ubicación ni contacto

**Feature Branch**: `045-avisos-y-ajustes`

**Created**: 2026-10-22

**Status**: Implementada y probada con el arnés E2E (wa-mock).

**Input**: Kevin, sobre el RC con 039–044: quitar del compositor enviar
ubicación y contacto; que al llegar un mensaje suene un aviso en el navegador
y que la pestaña muestre los pendientes, como WhatsApp Web.

**Depende de la 044**: toca el mismo compositor. La rama sale de
`044-notas-de-voz` y su PR, contra `main`, enseña también esos commits hasta
que #144 entre.

**Carril**: ligero (Principio VI). Solo interfaz: no toca el modelo de datos,
ni `/api/bot/*`, ni el despacho, ni ningún DTO.

## Comportamiento

**H1 — El compositor sin ubicación ni contacto.** Quedan el clip, los emojis,
el texto y la nota de voz.

**H2 — Suena al llegar un mensaje.** Un mensaje del cliente hace sonar un
aviso corto en cualquier pantalla de la app, salvo que ya estés mirando esa
conversación con la pestaña al frente. Lo que mandas tú (o el agente) no
suena. Una ráfaga suena una vez.

**H3 — La pestaña cuenta los pendientes.** «(3) Vocero — CRM…»: cuántos chats
tienen mensajes sin leer, como WhatsApp Web. Se actualiza en vivo y en todas
las pantallas.

**H4 — Se puede silenciar.** Una campana junto al tema, en el pie del menú,
apaga y prende el sonido; la elección se recuerda en ese navegador.

## Decisiones

**D1 — Ubicación y contacto: fuera de la interfaz, no del servidor.**
`POST …/messages` sigue aceptando `location` y `contacts` y la bandeja sigue
mostrando los que llegan. Un cerebro conectado o una integración los puede
seguir usando; solo el operador deja de verlos en el compositor.

**D2 — La pestaña cuenta chats, no mensajes.** Es lo que hace WhatsApp Web
(«(3) WhatsApp» son tres chats). El número del menú (junto a Bandeja) sigue
contando mensajes, como antes. Más de 99 se muestra «99+».

**D3 — Sonido propio, sintetizado.** Dos notas cortas con Web Audio (≈ 0.3 s).
No se copia el sonido de WhatsApp (tiene dueño) y no hay archivo que servir.
El navegador no deja sonar nada antes de que la persona toque la página: el
audio se despierta con el primer clic o tecla.

**D4 — Cuándo no suena.** Si la conversación del mensaje es la que está
abierta en la Bandeja, la pestaña está visible y tiene el foco. Entre un aviso
y otro hay al menos 1.5 s.

**D5 — Vive en el menú lateral.** Ya escuchaba los eventos para contar no
leídos y está en todas las pantallas; el aviso y el título se cuelgan de ahí
(`src/components/avisos-de-mensajes.ts`). La Bandeja solo le dice qué
conversación tiene abierta.

**D6 — El título se vuelve a poner.** Next reescribe `document.title` al
navegar; un `MutationObserver` sobre `<head>` vuelve a anteponer el contador.

**D7 — El hilo abre en el último mensaje aunque crezca después.** Hallado en
el RC: al volver a la Bandeja, una conversación corta con una foto abría en el
primer mensaje. El hilo bajaba al final cuando todavía cabía todo (scroll en
0) y la foto, al terminar de cargar, lo hacía crecer hacia abajo sin moverlo.
Ahora un `ResizeObserver` sobre el contenido lo mantiene abajo mientras crece
(fotos, audios, citas), salvo que el operador haya subido a leer: «abajo» es
a menos de 24 px del final.

**D8 — Ids del wa-mock que no se repiten.** El contador arranca en la hora y
no en 0: tras reiniciar el servidor, los `wamid.mock.N` ya no chocan con los
de corridas anteriores sobre la misma base (el CRM los descartaba como
duplicados y el arnés fallaba sin razón aparente).

## Qué NO se hace, y por qué

- **Notificaciones del sistema** (las del escritorio, con permiso del
  navegador): otro paso; piden permiso y una decisión de qué mostrar.
- **Punto en el favicon**: el favicon es de la marca (white-label); el título
  basta para la primera versión.
- **Sonidos por canal o elegir el sonido**: uno solo, silenciable.

## Criterios de aceptación

- **AC1** — El título antepone «(n)», no apila contadores, se limpia en cero y
  muestra «99+». (Unit: `tests/unit/avisos-de-mensajes.test.ts`.)
- **AC2** — El compositor no tiene ubicación ni contacto; clip y emojis
  siguen. (E2E, `scripts/e2e-avisos.mjs`.)
- **AC3** — La pestaña dice «(2)» con dos chats sin leer y baja al abrir uno.
  (E2E.)
- **AC4** — Suena un mensaje en otro chat, no el del chat abierto con foco, ni
  lo que se manda; una ráfaga suena una vez. (E2E.)
- **AC5** — La campana silencia, y sigue silenciada al recargar. (E2E.)
- **AC6** — En Pipeline la pestaña sigue contando y suena un mensaje nuevo.
  (E2E.)
- **AC6b** — Una conversación corta con una foto que tarda abre en el último
  mensaje, también al volver de otra pantalla; si subiste a leer, que crezca
  no te baja. (E2E.)
- **AC7** — Los arneses del compositor (039–044) siguen en verde. Gates:
  `typecheck`, `lint`, `test`, `build`.

## Constitution Check

| Principio | Cómo se cumple |
|---|---|
| I Seguridad | Nada nuevo sale al cliente; el título solo lleva un número |
| II Soberanía | Sonido sintetizado en el navegador, sin archivos ni terceros |
| III Multi-tenancy | Sin consultas nuevas: el conteo es el de `/api/conversations` |
| IV Idempotencia | Un aviso por ráfaga; marcar leído es lo de siempre |
| V Calidad verificable | E2E con el audio contado; unit del título |
| VI Spec antes de código | Este documento, carril ligero |
| VII Trazabilidad | D1 deja escrito que el servidor conserva ubicación y contacto |
| VIII Foco vertical | Atender más rápido: enterarse sin mirar la pestaña |
| IX Hecho = probado en vivo | E2E contra la app con mocks; oírlo en dev queda del responsable |
