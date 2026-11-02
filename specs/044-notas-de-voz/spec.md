# 044 — Notas de voz: grabar en el chat y escucharlas como en WhatsApp

**Feature Branch**: `044-notas-de-voz`

**Created**: 2026-10-22

**Status**: Implementada y probada con el arnés E2E (wa-mock).

**Input**: Kevin, probando el RC con las mejoras del chat (039–043): el
compositor no deja grabar audios; los audios que llegan se ven con el
reproductor del navegador, sin la velocidad 1.5×/2×, sin la onda y sin poder
ir a un momento; y Nea no transcribe las notas de voz porque su modelo no oye.

**Carril**: ligero (Principio VI). No toca el modelo de datos, ni el
despacho, ni ningún DTO. `/api/bot/*` no cambia. El envío es el de siempre
(`POST …/messages/media`) con un campo opcional más.

**Va con** nea-agent `fix/modelo-que-oye` (la transcripción vive en Nea).

## Comportamiento

**H1 — Grabar una nota de voz.** Con la caja vacía, el botón de enviar es un
micrófono, como en WhatsApp. Al tocarlo se pide el micrófono y se graba: punto
rojo, reloj y el nivel del micrófono. Se puede **detener y escuchar** antes de
mandar, **enviar** directo (detiene y manda) o **descartar**. Al escribir
texto, el botón vuelve a ser Enviar.

**H2 — Sale como nota de voz.** A WhatsApp llega como nota de voz (Ogg/Opus
con `voice: true`), no como un archivo de audio. Se puede responder citando,
igual que con el texto.

**H3 — Escuchar como en WhatsApp.** Todo audio del hilo (entrante, saliente y
la vista previa de la grabación) se oye con un reproductor propio:
reproducir/pausar, la onda del audio, tocar o arrastrar sobre la onda para ir
a un momento (también con flechas, Inicio y Fin), y velocidad 1× → 1.5× → 2×.
La velocidad elegida se recuerda para los siguientes audios. Solo suena uno a
la vez.

**H4 — Nea transcribe sin configurar nada.** Pensando por el CRM, Nea manda el
audio dentro del chat; con el modelo por defecto (`whisper-1`, que solo existe
en OpenAI) toda nota de voz fallaba. Ahora oye `google/gemini-3.5-flash-lite`.

**H5 — Lo que falla se dice.** Sin permiso de micrófono, sin micrófono, en un
navegador que no graba o sin https, el compositor dice por qué y sigue
usable. Si el envío falla, la nota se queda en la grabadora para escucharla o
reintentar.

## Decisiones

**D1 — WebM → Ogg en el servidor, sin recodificar.** Chrome y Edge solo graban
WebM/Opus y WhatsApp solo acepta notas de voz en Ogg/Opus. El audio es el
mismo: `src/lib/audio/webm-ogg.ts` saca los paquetes Opus del WebM y los mete
en páginas Ogg (RFC 7845), con su CRC y la posición de cada página calculada
del TOC de cada paquete. Sin ffmpeg ni dependencias (Principio II): la imagen
no gana un binario. El lector entra en los elementos maestros en vez de
saltarlos, porque `MediaRecorder` escribe el Segment y los Cluster con tamaño
desconocido. Un WebM que no se puede convertir se rechaza con el motivo
(415), no sale como documento.

**D2 — Qué graba cada navegador.** Firefox graba Ogg directo; Chrome/Edge,
WebM (D1); Safari, MP4/AAC, que WhatsApp acepta como audio pero no como nota
de voz: sale como audio normal (`voice` solo se pone si el archivo final es
Ogg). Mono (lo pide Meta) y 24 kbps: una nota de 2 min pesa ~360 KB, debajo de
los 512 KB con los que WhatsApp enseña el botón de reproducir.

**D3 — Tope de 15 minutos.** Al llegar, se detiene y queda para escucharla y
mandarla. 15 min a 24 kbps son ~2.7 MB, lejos de los 16 MB de Meta.

**D4 — El reproductor descarga el audio entero.** De ahí sale la onda
(`decodeAudioData` sobre un `OfflineAudioContext`) y, como el `<audio>` lee de
memoria, ir a cualquier punto funciona sin que `/api/media` sirva rangos. Se
descarga al acercarse a la vista, no al abrir el hilo. Si el navegador no
decodifica, la onda es una de reserva estable por audio.

**D5 — La duración total se redondea, la posición se trunca.** Una nota de
2.99 s dice «0:03»; mientras suena, el reloj corre como un reloj.

**D6 — `validateOutgoing` mira el tipo sin parámetros.** `audio/ogg;
codecs=opus` (la nota de voz, o lo que graba Firefox) se rechazaba como «tipo
no reconocido». Ahora se valida lo de antes del `;`, y a Meta se le sube con
el tipo completo `audio/ogg; codecs=opus`.

**D7 — El wa-mock se parece más a Meta.** Rechaza subir WebM (131053), guarda
lo subido (tipo, nombre, tamaño, firma) para que el arnés compruebe que salió
un Ogg, y sirve una nota de voz Ogg real para los audios entrantes.

**D8 — El adjunto avisa cuando ya bajó.** Hallado en el RC: un audio que
llegaba con la conversación abierta se quedaba en «descargando…» hasta
recargar. La burbuja se pinta con `message.new` antes de que termine la
descarga, y nadie avisaba al terminar (la bandeja ignora un segundo
`message.new` del mismo id). Ahora la ingesta publica `message.media` al
terminar (disponible o fallido) y la bandeja reemplaza el adjunto de ese
mensaje. Vale para todo adjunto entrante, no solo audios.

## Qué NO se hace, y por qué

- **Transcripción visible en la bandeja**: hoy transcribe Nea para contestar;
  enseñarla al operador es otra función (dónde se guarda, quién la paga).
- **Marcar en el hilo si un audio fue nota de voz o archivo**: haría falta una
  columna nueva; los dos se oyen con el mismo reproductor.
- **Pausar y seguir grabando**: WhatsApp Web tampoco deja; se detiene y se
  escucha.
- **Convertir el MP4 de Safari a Ogg**: habría que recodificar.

## Criterios de aceptación

- **AC1** — La grabación de Chrome (WebM con tamaños desconocidos) sale como
  Ogg/Opus mono con cada página íntegra (CRC), los mismos paquetes y la
  duración correcta; una grabación cortada se convierte con lo que hay; lo que
  no es WebM se rechaza. (Unit: `tests/unit/webm-ogg.test.ts`.)
- **AC2** — WebM → Ogg y nota de voz; Firefox pasa tal cual; Safari sale como
  audio normal; un WebM roto se rechaza. (Unit: `tests/unit/nota-de-voz.test.ts`.)
- **AC3** — El reproductor de una nota entrante enseña duración y onda; la
  velocidad pasa 1× → 1.5× → 2×; reproduce, avanza y pausa; tocar y arrastrar
  la onda, y el teclado, mueven la posición. (E2E,
  `scripts/e2e-notas-de-voz.mjs`.)
- **AC4** — Con la caja vacía el botón graba; al escribir es Enviar. Grabar,
  detener, escuchar y enviar llega a Graph como `audio` con `voice: true`, y lo
  subido es Ogg (`OggS`, `audio/ogg; codecs=opus`, `.ogg`). La nota aparece
  en el hilo con su duración y su onda. (E2E.)
- **AC5** — Enviar mientras graba la manda; descartar no manda nada. Si el
  envío falla, se dice y la nota sigue para reintentar. (E2E.)
- **AC6** — La velocidad elegida se recuerda al volver. Sin permiso de
  micrófono se dice por qué y la caja sigue usable. (E2E.)
- **AC7** — Nea: con `whisper-1` por el CRM, la nota de voz va a
  `google/gemini-3.5-flash-lite` con el audio dentro del chat; un modelo
  elegido se respeta. (pytest en nea-agent.)
- **AC8** — Gates: `typecheck`, `lint`, `test`, `build` en verde.

## Constitution Check

| Principio | Cómo se cumple |
|---|---|
| I Seguridad | El audio pasa por la misma validación y la misma ruta que el clip; nada nuevo sale al cliente |
| II Soberanía | La conversión es código propio, sin ffmpeg ni terceros; el modelo que oye va por el proxy de Ajustes → IA |
| III Multi-tenancy | No hay consultas nuevas |
| IV Idempotencia | Grabar no envía; el envío lleva la guarda de doble envío del adjunto (042) |
| V Calidad verificable | Unit del convertidor con una grabación real de Chromium; E2E con el micrófono falso grabando de verdad |
| VI Spec antes de código | Este documento, carril ligero |
| VII Trazabilidad | D6 deja escrito el arreglo de validación que salió de aquí |
| VIII Foco vertical | Atender por WhatsApp como en WhatsApp |
| IX Hecho = probado en vivo | E2E contra la app con mocks; la prueba con un número real (que la nota llegue como nota de voz al teléfono) queda pendiente del responsable |
