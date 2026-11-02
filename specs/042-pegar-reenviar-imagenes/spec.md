# 042 — Pegar y reenviar imágenes en WhatsApp

**Feature Branch**: `042-pegar-reenviar-imagenes`

**Created**: 2026-10-22

**Status**: Especificada antes de escribir código.

**Input**: un negocio que ya usa la bandeja en producción pidió poder
compartir imágenes sin pasar por el disco: hoy, para mandarle a un cliente la
foto que mandó otro (o una captura de pantalla), el operador tiene que
guardarla, buscarla con el clip y adjuntarla. La función ya funciona en el CRM
de ese negocio; aquí se vuelve a montar sobre el `main` de Vocero 2.0, con el
almacenamiento de la 037 (disco o bucket S3-compatible).

**Carril**: ligero (Principio VI). Sin migración. Añade una ruta a la API
interna de la bandeja (`POST /api/conversations/[id]/messages/forward-image`),
que consume solo la UI de este repo: no es un contrato publicado. `/api/bot/*`,
el despacho, el webhook y SSE no cambian.

## Comportamiento

**H1 — Pegar una imagen.** Con Ctrl+V (o Cmd+V) sobre el campo de escritura de
una conversación que admite adjuntos, una imagen del portapapeles queda como
adjunto con su vista previa, igual que si se eligiera con el clip: se le puede
escribir un pie, quitarla o mandarla. Pegar texto sigue igual.

**H2 — Reenviar una imagen del historial.** Bajo cada imagen del hilo hay
«Reenviar imagen». Abre un diálogo con la imagen, su pie (editable) y la lista
de conversaciones a las que se puede mandar, con búsqueda por nombre o
teléfono. Elegir un destino no envía: el botón dice «Reenviar a {nombre}» y
hasta pulsarlo no sale nada. Al salir, el hilo de origen enseña «Imagen
reenviada a {nombre}».

## Decisiones

**D1 — La imagen pegada pasa por la misma puerta que el clip.** Se valida en
el navegador (una sola, JPEG/PNG/WebP, hasta 5 MB: los límites de imagen de la
Cloud API, `IMAGEN_ADJUNTA` en `src/lib/imagen-adjunta.ts`, atados por una
prueba a `MEDIA_LIMITS.image`) para no pisar el adjunto que ya estaba ni subir
algo que se va a rechazar, y sale por `POST …/messages/media` como cualquier
adjunto, con sus guardas de servidor. Si no sirve, el motivo se ve y el texto y
el adjunto anteriores se quedan.

**D2 — Por capacidad del canal, no por nombre.** Pegar y reenviar se ofrecen
donde el canal admite adjuntos salientes (`outboundMedia`, que el DTO expone
como `composer.media`): hoy solo WhatsApp. En Instagram, Messenger o TikTok,
pegar una imagen avisa que el canal no admite adjuntos, y esas conversaciones
no aparecen como destino del reenvío. La ruta lo vuelve a comprobar.

**D3 — El reenvío nombra un mensaje, nunca un archivo.** El cuerpo es
`{ sourceMessageId, caption? }` y nada más (`.strict()`): ni URL ni ruta. El
servidor busca el mensaje, su adjunto y su conversación dentro de la
organización de la sesión; lo ajeno o inexistente es 404, igual que el destino.

**D4 — Se lee del almacén de la instancia (037).** El binario sale de
`readMediaFile`, que busca en el disco y en el bucket, así que vale con
`MEDIA_STORE=disco` o `bucket` y con archivos de antes y de después de cambiar
de almacén. Una imagen entrante que todavía no se bajó de Meta se baja antes
(`ensureAssetAvailable`, como la pide la bandeja al pintarla); si no se puede,
410 `gone` sin enviar nada. Por eso «Reenviar imagen» aparece en toda imagen,
también en una cuya descarga falló: el servidor la reintenta (añadido al
implementar: con wa-mock la primera descarga en segundo plano puede fallar y
la bandeja la recupera al pintarla, pero el DTO sigue diciendo `failed`).

**D5 — Es una copia nueva.** El reenvío sale por `sendMediaMessage` como un
adjunto nuevo: se sube a Meta otra vez (el id de un archivo entrante no sirve
para mandarlo) y se guarda como un asset nuevo. Editar el pie solo cambia la
copia. Sin pie en la petición se conserva el del original; con un pie vacío
sale sin pie. No hay etiqueta de «reenviado»: la Cloud API no la ofrece.

**D6 — Con todas las guardas del envío.** Destino del Laboratorio: 403
`sandbox_violation`. Origen del Laboratorio: también. Ventana cerrada: 409
`window_closed` (el diálogo ya enseña esos destinos deshabilitados). Mismo
origen y destino: 422. Si Meta falla tras guardar, el mensaje queda en el
historial como fallido, igual que un adjunto normal.

**D7 — Un envío a la vez.** Mientras sube un adjunto o sale un reenvío, los
controles que lo cambiarían se deshabilitan; un segundo clic no duplica, y
Escape o un clic fuera no cierran el diálogo a medio envío. Si la red falla, el
adjunto o la selección se quedan para reintentar.

**D8 — Se corrige el mensaje de error del compositor.** El compositor leía
`message` en la raíz de la respuesta, pero `apiError` responde
`{ error: { code, message } }`: un adjunto rechazado decía «Error 413» en vez
del motivo. Ahora dice el motivo, y un fallo de red tiene su propio mensaje.

## Qué NO se hace, y por qué

- **Varias imágenes o varios destinos a la vez**: es la puerta del envío
  masivo (Principio VIII). Una imagen, un destino.
- **Reenviar videos, audios o documentos**: no se pidió; el diálogo y la
  validación son de imagen.
- **Pegar HTML o el enlace de una imagen**: sería descargar de un tercero desde
  el servidor; solo se acepta el binario del portapapeles.
- **Destinos nuevos** (un número que no tiene conversación): la ventana de 24 h
  estaría cerrada de todos modos.
- **Reenviar desde el Laboratorio**: sus conversaciones jamás tocan la API real.

## Criterios de aceptación

- **AC1** — `forwardImage` lee el archivo de la organización y llama a
  `sendMediaMessage` con el pie editado, sin tocar el original; rechaza sin leer
  ni enviar un origen inexistente, del Laboratorio, que no sea imagen (documento,
  sticker, SVG) o de la misma conversación; baja la imagen pendiente; 410 si no
  se puede bajar o falta en el almacén. (Unit, `tests/unit/forward-image.test.ts`.)
- **AC2** — La ruta exige sesión, busca el destino en la organización de la
  sesión (404 si no), rechaza destino del Laboratorio (403) y sin adjuntos
  (422 en Instagram, Messenger y TikTok), no acepta URL, ruta ni pie de más de
  1024 caracteres (422) y traduce los errores del envío. (Unit.)
- **AC3** — `validarImagenAdjunta` acepta una JPEG/PNG/WebP de hasta 5 MB y
  rechaza varias, otro formato o más peso; sus límites son los del servidor.
  (Unit.)
- **AC4** — En la bandeja: pegar una imagen la deja como adjunto con vista
  previa, pie y envío, y llega a Graph y al hilo; pegar texto no la toca; pegar
  un GIF, más de 5 MB o dos imágenes avisa sin perder el adjunto ni el texto.
  (E2E, `scripts/e2e-imagenes.mjs`.)
- **AC5** — Reenviar: el diálogo enseña la imagen, el pie y solo destinos de
  WhatsApp distintos del origen, con los de ventana cerrada deshabilitados;
  elegir no envía; Cancelar y Escape no envían; confirmar manda una copia con
  el pie editado al destino, y el original no cambia. (E2E.)
- **AC6** — Por API: sin sesión 401; destino de otra organización 404; destino
  del Laboratorio 403; ventana cerrada 409; nada de eso llega a Graph. (E2E.)
- **AC7** — Si la red falla al mandar un adjunto pegado, el adjunto se queda y
  el aviso se ve; al reintentar sale. (E2E.)
- **AC8** — Gates: `typecheck`, `lint`, `test`, `build` en verde, con banderas
  apagadas y con `CHANNELS` + `AGENDA`.

## Constitution Check

| Principio | Cómo se cumple |
|---|---|
| I Seguridad | El cliente nombra un mensaje, no un archivo (D3); todo se resuelve en la organización de la sesión |
| II Soberanía | Sin terceros nuevos: Cloud API y el almacén que ya tenga la instancia (D4) |
| III Multi-tenancy | Origen y destino con `scoped()` y `organization_id` en los tres JOIN |
| IV Idempotencia | Sin escrituras nuevas fuera de `sendMediaMessage`; el doble clic no duplica (D7) |
| V Calidad verificable | Unit del origen, la ruta y la validación; E2E de la bandeja con wa-mock |
| VI Spec antes de código | Este documento, carril ligero (la ruta es de la API interna) |
| VII Trazabilidad | D8 deja escrito el arreglo que viaja con la feature |
| VIII Foco vertical | Atender más rápido; sin envío masivo («Qué NO se hace») |
| IX Hecho = probado en vivo | E2E contra la app con mocks; en vivo con un número real queda pendiente del responsable |
