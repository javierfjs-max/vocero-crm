# 046 — Referencias para la 2.2: qué aprender de los mejores

**Rama**: `feat/046-referencias-2.2` (desde `origin/main` 2.1.0, `9940226`)

**Creado**: 2026-10-22

**Estado**: Fase 1 entregada y elegida por Kevin el 2026-10-23 (sección
«Elección de Kevin», al final). No se ha escrito código del producto.

**Carril**: exento (Principio VI). Es un estudio: no hay comportamiento nuevo.
Cada función que Kevin elija tendrá su propia spec (047, 048…) con su carril.

## Cómo se hizo

- **Licencias**: confirmadas el 22-oct contra la API de GitHub y el `LICENSE`
  de cada repo (no contra la tabla del encargo).
- **Observación**: Chatwoot, libredesk, Frappe CRM y Twenty corrieron en
  Docker, cada uno con sus puertos atados a `127.0.0.1` (3101 a 3105) y datos
  demo propios: una «Ferretería Demo» con seis prospectos de WhatsApp. Sus
  scripts solo corrieron dentro de su contenedor. Los condujo un Chrome
  aislado (perfil temporal, CDP en `127.0.0.1:9333`). REA inspeccionó las
  páginas (`inspect_web_page`), sacó capturas (`capture_web_screenshot`) y
  leyó un HAR (`inspect_web_network_capture`). No se usó
  `capture_browser_scenario`.
- **Repos MIT sin app corriendo** (wacrm, DeskcommCRM, whatsapp-saas): se
  leyó su código con `gh api`, sin clonar ni ejecutar. Se puede adaptar con
  atribución.
- **Repos AGPL** (libredesk, Frappe CRM y el grueso de Twenty): solo la app
  corriendo, las capturas y su documentación. No se leyó su código.
- **Capturas**: en `scratch/046-referencias/{chatwoot,libredesk,frappe-crm,twenty}/`
  (52 PNG). `scratch/` está en `.gitignore` **a propósito**: llevan logos y
  marca de terceros, y no deben entrar al repo público. Sirven para el estudio
  y para el video.
- **Lo que trajeron los repos**: whatsapp-saas, wacrm y DeskcommCRM traen
  instrucciones para asistentes de IA (`CLAUDE.md`, `AGENTS.md`,
  `.claude/settings.json` con comandos preaprobados, `curl … | bash`). Se
  trataron como datos y no se siguió ninguna.

## Licencias verificadas

| Repo | Licencia real (22-oct) | Qué se puede tomar |
|---|---|---|
| `chatwoot/chatwoot` | MIT («MIT Expat») **fuera de `enterprise/`**, que tiene licencia propia | Código fuera de `enterprise/`, con atribución. Captain, SLA y parte de los reportes viven en `enterprise/`: de ellos, solo el comportamiento |
| `abhinavxd/libredesk` | AGPL-3.0 | Solo observar |
| `frappe/crm` | AGPL-3.0 | Solo observar |
| `twentyhq/twenty` | AGPL-3.0 con excepción; **MIT** en `twenty-ui`, `twenty-sdk`, `twenty-shared`, `twenty-client-sdk`, `create-twenty-app` y `twenty-apps`; archivos `/* @license Enterprise */` comerciales | Observar la app; `twenty-ui` es MIT, pero es otro sistema de diseño: no conviene traerlo |
| `ArnasDon/wacrm` | MIT (sin carpetas con otra licencia; `public/opus/encoderWorker.min.js` es un binario de terceros sin cabecera) | Código, con atribución |
| `melgarafael/DeskcommCRM` | MIT | Código, con atribución (su WhatsApp es WAHA: eso no) |
| `Carlos-Dominguez-faber/whatsapp-saas` | MIT | Código, con atribución |

**Candidatos añadidos**: ninguno entra a la matriz. Se revisaron y quedaron
fuera:

- `krayin/laravel-crm` (MIT, 24 k ★): CRM genérico en Laravel; su WhatsApp es
  un complemento de pago.
- `papercups-io/papercups` (MIT): sin cambios desde febrero de 2024.
- `RocketChat/Rocket.Chat` (MIT con EE): plataforma de chat de equipo, otro
  producto.
- `zammad/zammad` (AGPL): mesa de ayuda por correo.

Ninguno enseña algo que no traigan ya los siete.

## Lo que se vio en cada candidato

### Chatwoot (MIT fuera de `enterprise/`)

Es la bandeja más completa. Capturas `cw-*`.

- **Nota privada en el mismo compositor** (`cw-05`, `cw-02`): pestañas
  «Reply / Private Note» sobre la misma caja. La nota se pinta en el hilo con
  fondo ámbar y un candado, y nunca sale al cliente.
- **Respuestas rápidas con «/»** (`cw-06`): al teclear `/` se abre un menú con
  buscador, a la izquierda los atajos y a la derecha la vista previa del
  texto. El texto de la caja dice cómo usarlo: «Start with '/' to select a
  Canned Response».
- **Eventos dentro del hilo** (`cw-03`, `cw-04`): píldoras centradas y grises
  como «Demo Admin self-assigned this conversation» o «added mayoreo,
  cotizacion».
- **Barra de comandos Ctrl+K** (`cw-07`) y **ayuda de atajos con Ctrl+/**
  (`cw-08`). Los atajos van con Alt: J/K para cambiar de conversación, E para
  resolver, P para nota privada, L para responder y M para posponer.
- **Pestañas Mías / Sin asignar / Todas con contador**, y en el menú,
  Menciones, Participando y **Sin atender** (`cw-01`).
- **Filtros de condición** con «Add filter» (`cw-09`): estado, etiqueta,
  canal… y se guardan como vista.
- **Panel del contacto** con secciones plegables (`cw-04`): acciones,
  macros, atributos, notas del contacto, adjuntos, conversaciones anteriores y
  participantes. Tiene un botón para **fusionar contactos**.
- **Estado de la conversación**: el botón «Resolve» con menú (posponer).
- **En el celular, la conversación se tapa** (`cw-19`): el panel del contacto,
  abierto en escritorio, ocupa toda la pantalla. Es un antiejemplo para
  Vocero.
- Modo oscuro (`cw-17`), macros (`cw-14`), atributos personalizados (`cw-15`),
  automatizaciones (`cw-13`) y reportes (`cw-11`).

### libredesk (AGPL — solo observado)

Es la referencia de «ligero». Capturas `ld-*`.

- **Un solo binario en Go**: imagen de **73,9 MB** y **128 MiB de RAM** en
  reposo con su Postgres y su Redis (medido con `docker stats`).
- **Ya trae WhatsApp por la Cloud API oficial (beta, v2.9.0)** (`ld-06`): Phone
  number ID, WABA ID, token, app secret, versión de API y verify token. Al
  crear el inbox **valida las credenciales contra Meta en el momento**
  (`ld-07`: «Meta rejected these credentials: Invalid OAuth access token»).
  Vocero ya hace lo mismo con «Probar conexión».
- **Ajustes por inbox con buen criterio**:
  - «Prompt to tag before replying» (pedir etiqueta antes de responder, sin
    bloquear).
  - Encuestas CSAT al resolver.
  - «**Reopen window** (hours)»: si el cliente escribe dentro de N horas de
    resuelta, se reabre la misma conversación en vez de abrir otra.
- **Barra de comandos Ctrl+K** con acciones y no solo navegación (`ld-02`):
  filtrar por estado, ordenar, nueva conversación (Alt+C), nueva vista y
  nueva vista compartida.
- **Vistas personales y compartidas**. En el admin, los estados de
  conversación son configurables, igual que etiquetas, atributos y vistas
  compartidas (`ld-09`).
- **Una banda «Connecting…» arriba** cuando el tiempo real se cae (`ld-01`,
  `ld-07`): la degradación se ve. Vocero no avisa cuando el SSE se cae.
- Modo oscuro según el sistema (`ld-11`), «Complete your setup» en la bandeja
  vacía (`ld-11`) y un móvil limpio (`ld-12`).

### Frappe CRM (AGPL — solo observado)

Es el kanban de ventas. Capturas `fc-*`.

- **Kanban** (`fc-02`):
  - Columnas con punto de color.
  - Un **+ en cada columna** para crear ahí mismo.
  - Tarjetas con monto, «hace 2 minutos» y una fila de iconos de actividad
    (menciones, notas, tareas, comentarios).
  - **Filtros rápidos en línea** sobre el tablero (Organización, Estado,
    Probabilidad).
  - Botón «Kanban settings» para elegir qué campos lleva la tarjeta.
- **Lista con filtros rápidos por columna** (`fc-01`). **Los registros ya
  vistos dejan de ir en negrita**: es un «no leído» aplicado a prospectos.
- **Ficha del trato con pestañas** (`fc-03`): Activity, Emails, Comments, Data,
  Calls, Tasks, Notes y Attachments. «Assign To» y el estado van arriba, y la
  actividad es una línea de tiempo («Administrator created this deal»).
- **Lo que mostró la base y no se veía en pantalla**: los ajustes de FCRM
  traen `auto_mark_replied_on_response`, `auto_reopen_on_new_communication` y
  `restore_demo_data`. Además, el asistente inicial trae **«Share usage
  data» marcado por defecto**: Vocero no debe hacer eso.

### Twenty (AGPL; `twenty-ui` MIT — solo observado)

Son tablas tipo Notion. Capturas `tw-*`.

- **Fila de cálculo al pie de la tabla** (`tw-06`): «Calcular», únicos de
  correos 5 y vacío de teléfono 0 %. Mide la higiene de los datos sin salir de
  la lista.
- **Kanban con la suma en el encabezado** de cada columna (`tw-07`: «New 80k»).
  Vocero ya lo tiene desde 1.x.
- **El filtro separa campos visibles y ocultos** (`tw-08`), y trae «Buscar
  cualquier campo» y «Filtro avanzado».
- **Ficha del registro** (`tw-10`): campos en grupos plegables a la izquierda
  y, a la derecha, pestañas Cronología, Tareas, Notas, Archivos, Correo y
  Calendario.
- Datos demo al crear el espacio y un alta en cuatro pasos (correo,
  espacio, perfil e invitar, `tw-00` a `tw-04`).

### wacrm (MIT — código leído)

Es el más parecido a Vocero.

- **Filtro «por vencer»**: conversaciones cuya ventana de 24 h se cierra en
  menos de 2 h (`src/lib/inbox/inbox-filters.ts`). También tiene «esperando
  respuesta», «sin asignar» y abiertas, pendientes o cerradas.
- **Deduplicación**: teléfono normalizado generado más UNIQUE parcial. Una
  coincidencia exacta bloquea y una aproximada (prefijo troncal) solo avisa
  (`src/lib/contacts/dedupe.ts`, migración `022`).
- **Notificaciones del navegador sin push**: API `Notification`, sin
  duplicados en 30 s, recorte a 120 caracteres y permiso por dispositivo
  (`src/lib/notifications/browser-notify.ts`).
- **Respuestas rápidas** compartidas, con «guardar como respuesta rápida»
  desde el compositor (`quick-reply-picker.tsx`; no usa `/`).
- **Tablero de tiempos de respuesta**: `last_inbound_at`, `last_reply_at`,
  `closed_at` y una meta en minutos (migración `059`).
- **Base de conocimiento**: `tsvector` siempre y pgvector solo con llave
  (`030_ai_knowledge.sql`).

### DeskcommCRM (MIT — código leído; su WAHA no)

- **Fusión de contactos**, el mejor patrón de los tres:
  - El perdedor queda como **lápida** (`is_merged_into`, `merged_at`) en vez
    de borrarse.
  - Las FK se reapuntan **leyendo `pg_constraint`**, sin una lista escrita a
    mano.
  - El webhook nunca fusiona solo: el conflicto se parquea para que lo decida
    una persona.
  - Rutas: `lib/contacts/duplicados.ts` y migración `0215`.
- **Asignación con historial y control de carrera**:
  `conversation_assignment_events` guarda de quién a quién y por qué (`claim`,
  `transfer`, `release`, `handoff`). La función recibe el «asignado esperado»
  y rechaza el cambio si otro ganó.
- **Notas internas por conversación** con tiempo real (`conversation_notes`).
- **Respuestas rápidas personales o compartidas con `/`** (`message_templates`,
  `owner_user_id` nulo = compartida).
- **Atajos j/k/r/a/e y ayuda con «?»** (`InboxKeyboardShortcuts.tsx`).
- **Refetch de seguridad** que detecta que el tiempo real murió en silencio
  (`useRefetchDeSeguranca.ts`).
- **PWA con Web Push (VAPID)**: el push solo llega a quien puede ver la
  conversación y redacta el texto en la pantalla bloqueada.

### whatsapp-saas (MIT — código leído)

**No guarda el payload del webhook.** Reintenta una capa más adentro:

- El mensaje se guarda con `ON CONFLICT (wamid)`.
- Si falla antes de guardar, responde 500 y Meta reenvía.
- Si falla después, un **lote con reserva** (`message_batches`: `buffering`,
  `processing`, `processed`, `flushed`, `cancelled`) se reclama con un lock
  por conversación, y una reserva vencida (7 min) se recupera sumando un
  intento.
- **Espera distinta para el error transitorio** (1, 5 y 15 min) y **para el
  determinista** (30 s × n), con tope de 3.
- **Puntos de control** para no repetir un efecto: si la respuesta ya salió,
  solo cierra el lote; si ya escribió una cita, pasa a una persona.
- **Lote muerto**: handoff, nota interna en el hilo y evento de error.
- `reconcileOrphanedMessages` rescata cada minuto los mensajes que quedaron
  sin lote.
- Rutas: `src/features/inbox/services/buffer.ts` y migración
  `20260929000001_atomic_batches_and_serialized_claim.sql`.

## Lo que REA enseñó que no se veía a simple vista

1. **Chatwoot guarda el borrador de cada conversación** en `localStorage`
   (`draftMessages`, `draftMessages:ts`): lo dejaste escrito, cambiaste de
   chat, volviste y sigue ahí. **Vocero lo tira** al cambiar de conversación:
   la 028 (D5) remonta el compositor para que un adjunto no se cruce de chat,
   y el texto se va con él.
2. **Chatwoot cachea el catálogo en IndexedDB** (`cw-store-1`) y pregunta
   `GET /cache_keys` antes de pedir de nuevo etiquetas, inboxes o equipos. En
   el HAR, la segunda carga contesta `cache_keys` en 1 ms.
3. **Chatwoot avisa a los demás agentes de que alguien está escribiendo**
   (`POST …/toggle_typing_status` mientras se teclea) y marca la lectura con
   `POST …/update_last_seen`. Es la base para «Laura está respondiendo» y
   evitar que dos personas contesten lo mismo.
4. **La PWA de Chatwoot es mínima**: `manifest.json` (`display: standalone`) y
   un `sw.js` de 35 líneas que **solo** atiende `push` y `notificationclick`.
   No cachea datos. **libredesk registra un service worker sin manifest**: da
   notificaciones, pero no se instala.
5. **libredesk sí sale a internet desde el contenedor** para validar
   credenciales con Meta (el aviso de `ld-07` viene de la Graph API). Aislar
   a `127.0.0.1` cubre los puertos, no la salida. Con credenciales falsas no
   hubo riesgo.
6. **Límites de la herramienta**:
   - `inspect_web_page` solo ve el tráfico **posterior** a engancharse
     (`attach_limited`): el websocket de Chatwoot, abierto antes, no aparece.
   - `capture_web_screenshot` devuelve el PNG en base64 dentro de la
     respuesta (146 KB, más de lo que cabe en una respuesta de herramienta);
     se recuperó del archivo de resultados.
   - `compare_web_screenshots` pide las dos imágenes en línea: con capturas
     completas no cabe. Para el antes/después de la Fase 2 se propone
     comparar recortes reducidos, o un diff local con las mismas métricas.

## Medido: qué tan pesado es cada uno

Contenedores en reposo con datos demo, medidos el 22-oct a las 22:54 con
`docker stats --no-stream`:

| | Imagen de la app | RAM total (app + BD + caché) |
|---|---|---|
| **Vocero 2.0 / 2.1** | 334 MB | 115 MiB (app 80 + Postgres 35; sin Redis) |
| libredesk 2.9.0 | 73,9 MB | 128 MiB |
| Frappe CRM (bench de desarrollo) | 3,83 GB | 614 MiB |
| Chatwoot | 2,73 GB | 1 104 MiB |
| Twenty | 1,85 GB | 1 862 MiB |

Vocero ya juega en la liga de libredesk. Cada spec de abajo se mide contra
eso: nada que agregue un proceso, un Redis o una dependencia de runtime.

## ¿Sigue el webhook como en el análisis del 12-oct?

**Sí.** En `main` (`9940226`):

- `src/app/api/webhooks/wa/[webhookToken]/route.ts` valida, responde 200 y
  procesa en `after()`. Si `processPayload` lanza, solo queda
  `console.error("[webhook] error procesando payload:", err)`.
- Meta no reenvía porque ya recibió 200, y nada guarda el evento.
- Igual en `/api/webhooks/{ig,messenger,tiktok}`.
- Además, si el contenedor se reinicia con un `after()` en curso (un
  redespliegue), el evento se pierde sin dejar ni la línea en el log.

La deduplicación por `wa_message_id` UNIQUE ya existe: reprocesar un evento
es seguro. Lo que falta es **guardarlo antes de procesarlo**. Es el candidato
más fuerte de la versión (047).

## La matriz

Abreviaturas: **CW** Chatwoot · **LD** libredesk · **FC** Frappe CRM · **TW**
Twenty · **WA** wacrm · **DC** DeskcommCRM · **WS** whatsapp-saas. Esfuerzo:
**S** (≤1 día), **M** (2–3 días), **L** (>3 días).

| Función | Repo | Licencia | ¿Vocero ya lo tiene? | Encaje con la frontera (§1) | Esfuerzo | Por qué le importa a un negocio que vende por WhatsApp |
|---|---|---|---|---|---|---|
| Guardar el evento crudo del webhook y reintentar | WS (patrón de reintento), idea propia | MIT | No: `after()` + log | Núcleo | M | Un mensaje perdido es una venta perdida y contradice «la vía oficial y seria» |
| PWA instalable (manifest y SW mínimo) | CW, DC | MIT | No: sin manifest ni SW | Núcleo; Web Push aparte (ver «PWA») | S | El dueño contesta desde el celular como si fuera una app, sin tiendas |
| Respuestas rápidas con «/» | CW, DC, WA | MIT | No | Núcleo | M | Precios, horario, envíos y pago se escriben 30 veces al día |
| Nota interna en el mismo compositor | CW, DC, WS | MIT | A medias: una nota por contacto en el panel | Núcleo | M | «Ofrécele 5 %» o «ya pagó» sin que el cliente lo vea y en contexto |
| Borrador por conversación | CW (visto con REA) | MIT | No: se pierde al cambiar de chat (028 D5) | Núcleo | S | Con 3 chats a la vez, el texto a medias no se pierde |
| Filtros «por vencer (24 h)» y «sin responder» | WA | MIT | No: Todas, No leídas, De anuncios y por etapa | Núcleo | S | Pasada la ventana solo sale una plantilla de pago: avisar antes es dinero |
| Asignar a una persona + «Mías / Sin asignar» | CW, DC, LD, FC | MIT / AGPL | No | Núcleo (equipos de 2–5 en una instancia) | M | Dos vendedores no contestan al mismo cliente y nadie queda sin dueño |
| Eventos dentro del hilo | CW, FC | MIT / AGPL | A medias: la bitácora de etapas vive en la ficha del lead | Núcleo | S–M | Ver en el chat «pasó a Cotización» o «la IA se pausó» explica lo que pasó |
| Atajos de teclado + ayuda | CW, DC | MIT | No | Núcleo | S | El que atiende 100 chats al día no suelta el teclado |
| Barra de comandos Ctrl+K | CW, LD | MIT / AGPL | No | Núcleo | M | Saltar a un contacto o una pantalla sin buscar en el menú |
| Notificación del sistema con la pestaña oculta | WA | MIT | A medias: sonido y contador en la pestaña (045) | Núcleo (API `Notification`, sin push) | S | Se entera aunque esté en otra pestaña o ventana |
| Aviso visible de «sin conexión en tiempo real» | LD, DC | AGPL / MIT | No | Núcleo | S | Si el SSE se cae, hoy la bandeja se queda quieta sin decir nada |
| Fusionar contactos duplicados | DC, WA, CW | MIT | No | Núcleo | L | El mismo cliente por teléfono y por BSUID parte su historia en dos |
| Etiquetas de conversación | CW, DC, LD | MIT / AGPL | No (hay etapas y prioridad) | Núcleo, con cuidado de no duplicar etapas | M | «mayoreo», «urgente»: cortes que no son etapa del embudo |
| Quién está escribiendo / viendo | CW (visto con REA) | MIT | No | Núcleo | M | Evita la doble respuesta en equipo |
| Resolver/reabrir y ventana de reapertura | CW, LD, FC | MIT / AGPL | No (hay archivar contacto) | Dudoso: Vocero ordena por embudo, no por tickets | M | Útil en soporte; en ventas lo cubre la etapa |
| Tarjetas del kanban configurables + filtros rápidos en el tablero | FC, TW | AGPL | Totales sí; campos fijos | Núcleo | M | Ver en la tarjeta lo que importa a ese negocio |
| Fila de cálculo en la tabla de contactos | TW | AGPL | No | Núcleo | S | Higiene: cuántos sin teléfono o sin etapa |
| Web Push (avisos con la app cerrada) | DC, CW | MIT | No | **Conector opcional** (ver «PWA») | M | El aviso llega con el celular bloqueado |
| Campos personalizados con definición | DC, WA, CW | MIT | A medias: la ficha (claves libres, la escribe el cerebro) | Núcleo | M | Talla, modelo, colonia: datos del giro sin tocar código |
| Tablero de tiempo de respuesta | WA | MIT | A medias: Resultados (019) | Núcleo | M | Cuánto tarda el negocio en contestar |
| Macros (varias acciones en un clic) | CW | MIT | No | **Fuera**: es la puerta del motor de flujos | — | — |
| SLA, CSAT, centro de ayuda, campañas | CW, LD | MIT / AGPL | No | **Fuera**: mesa de soporte, difusión u otro producto | — | — |
| Multitenant, WAHA/QR, prospección | DC, WS, WA | MIT | — | **Fuera** (§1) | — | — |

## PWA: qué entra al núcleo y qué no

- **Entra**:
  - Un `manifest` servido por la app (`src/app/manifest.ts`) con el nombre y
    los colores de la **marca de la organización**: white-label, nada de
    «Vocero» cableado.
  - Iconos que salen del logo guardado (028 y 002 ya lo tienen) o, si no hay
    logo, de la inicial sobre el color de marca.
  - Un service worker **mínimo**, que no guarda datos de clientes en el
    celular, más una página «sin conexión».
  - Con eso, Chrome y Edge ofrecen «Instalar» y en iPhone queda «Agregar a
    inicio».
  - **Cero dependencias nuevas y cero terceros.**
- **No entra al núcleo: Web Push.** Las notificaciones con la app cerrada
  pasan por el servicio de push del navegador (Google, Apple, Mozilla).
  - Es un tercero en el camino aunque las llaves VAPID las genere la
    instancia.
  - Por el Principio II, va como **conector opcional** tras su bandera (p. ej.
    `PUSH=on`), apagado por defecto.
  - Su degradación ya existe: el sonido y el contador de la 045.
  - Propuesto como spec aparte, **no** para la 2.2 salvo que Kevin lo pida.

## Ranking y plan de specs

Ordenadas por valor para quien vende por WhatsApp contra lo que cuestan.
Ninguna agrega dependencias de runtime, procesos ni Redis. Ninguna toca
`/api/bot/*` ni el contrato del despacho, salvo donde se dice.

| # | Spec propuesta | Carril | Migración | Inspiración (licencia) | Notas de diseño |
|---|---|---|---|---|---|
| 1 | **047 — Webhook a prueba de fallos**: guardar el evento crudo (WhatsApp y los tres canales sociales) antes de procesarlo, reintentar con espera y dejar a la vista lo que se agotó | Ciclo completo | Sí, aditiva (`webhook_event`) | WS (MIT): lease, espera transitoria/determinista, tope, lote muerto. Se adapta el patrón del outbox del despacho (021), que ya es nuestro | La organización se resuelve al recibir, por `phone_number_id`. Si no se resuelve, el evento se guarda igual con una justificación escrita (Principio III). Se reprocesa con la dedup de `wa_message_id`. Ajustes → Estado y `/api/health` enseñan los agotados. Se purga a los N días |
| 2 | **048 — Vocero en el celular (PWA)**: instalable, con la marca de la organización | Ligero | No | CW, DC (MIT) | Ver «PWA». Sin push |
| 3 | **049 — Respuestas rápidas con «/»** | Ciclo completo | Sí (`quick_reply`) | CW, DC (MIT) | Compartidas por la organización. Variables `{nombre}`. Las administra Ajustes. No son plantillas de Meta: solo dentro de la ventana |
| 4 | **050 — Notas internas en el hilo** | Ciclo completo | Sí (nota como mensaje que no sale, o tabla propia; se decide en el plan) | CW, DC (MIT) | Guardarraíl como el sandbox: una nota **jamás** llega a `send.ts` ni a la API de Meta. No cuenta como «sin responder» ni abre la ventana. No viaja en el despacho, que no cambia |
| 5 | **051 — Borrador por conversación** | Ligero | No | CW (MIT), visto con REA | Se guarda el texto por conversación en el navegador. Se mantiene la decisión D5 de la 028: el adjunto no viaja entre chats |
| 6 | **052 — Filtros «por vencer» y «sin responder»** | Ligero | No (`last_inbound_at` ya existe) | WA (MIT) | La duración sale de `windowMsFor(channel)`; nunca «24 h» cableado |
| 7 | **053 — Asignar conversaciones + «Mías / Sin asignar»** | Ciclo completo | Sí (`assigned_user_id` + historial) | DC, CW (MIT) | Control de carrera con el asignado esperado. ¿Expone `assignee` en `/api/bot/context`? Solo agregar una llave cabe; se decide en el plan |
| 8 | **054 — Eventos en el hilo** (etapa, asignación, IA pausada o reanudada, handoff) | Ligero si se pinta desde lo que ya se guarda; sube de carril si necesita tabla | Probablemente no | CW (MIT), FC (observado) | Lee `lead_stage_event` y lo que deje la 053 |
| 9 | **055 — Atajos y Ctrl+K** | Ligero | No | CW, DC (MIT); LD (observado) | Alt+J/K, `/`, Alt+P nota, «?» para la ayuda |
| 10 | **056 — Avisos del sistema y «sin conexión»** | Ligero | No | WA, DC (MIT); LD (observado) | Notification API con la pestaña oculta (extiende la 045) y una banda cuando el SSE no reconecta |
| 11 | **057 — Fusionar contactos duplicados** | Ciclo completo | Sí (lápida) | DC (MIT) | El más delicado: toca `wa_identity` |
| 12 | **058 — Etiquetas de conversación** | Ciclo completo | Sí | CW, DC (MIT) | Solo si Kevin ve un hueco que las etapas no cubren |

**Recorte sugerido para la 2.2**: 047, 048, 049, 050, 051 y 052.

- 047 es la robustez.
- 048 es el celular.
- 049, 050 y 051 son el compositor.
- 052 es la ventana.

Seis specs pequeñas, ninguna con dependencias nuevas, y cuatro de ellas
caben en un día. Con equipo, 053 y 054 son el siguiente paquete natural.

## Choques con la constitución

1. **Web Push** choca con el Principio II si va al núcleo. Resuelto arriba:
   PWA sin push en el núcleo, push como conector opcional y fuera de esta
   versión.
2. **Capturas de terceros**: «nunca logos ni marca de otro» se cumple dejando
   las capturas fuera del repo (`scratch/`). Las capturas de antes y después
   de la Fase 2 serán solo de Vocero.
3. **`compare_web_screenshots`** no admite capturas completas (ver «Lo que REA
   enseñó», punto 6). No es un choque con la constitución, pero el encargo
   pide usarlo. Propuesta: comparar recortes reducidos de la misma zona, o
   un diff local que dé las mismas métricas, y anotarlo en la bitácora.

## Elección de Kevin

**2026-10-23 — Kevin elige el recorte sugerido**: entran a la 2.2

- 047 — Webhook a prueba de fallos (se empieza por esta);
- 048 — Vocero en el celular (PWA);
- 049 — Respuestas rápidas con «/»;
- 050 — Notas internas en el hilo;
- 051 — Borrador por conversación;
- 052 — Filtros «por vencer» y «sin responder».

Quedan fuera de la 2.2: 053 a 058 y Web Push.

**2026-10-23 — Pendiente para después, pedido por Kevin** al probar la
2.2.0-rc.1 en Android:

- **059 — Reenviar cualquier mensaje y deslizar para responder.** Hoy solo se
  reenvían imágenes (042). Hacen falta dos cosas:
  - reenviar también texto, audio y documentos;
  - en el celular, arrastrar el mensaje hacia un lado para responderlo, como
    en WhatsApp.

  En el teléfono la flecha de «Responder citando» (039) se lee como
  «reenviar».

  Carril probable: ligero. El reenvío de imagen ya tiene su ruta; habrá que
  ver si los otros tipos necesitan contrato.
