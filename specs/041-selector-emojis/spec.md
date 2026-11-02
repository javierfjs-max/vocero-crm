# 041 — Selector de emojis en el compositor

**Feature Branch**: `041-selector-emojis`

**Created**: 2026-10-22

**Status**: Especificada antes de escribir código.

**Input**: un negocio que ya usa la bandeja en producción pidió un selector de
emojis junto al campo de escritura, como el de WhatsApp. Hoy el operador solo
puede escribirlos con el teclado del sistema (en Windows, `Win + .`), que casi
nadie conoce. La función ya funciona en el CRM de ese negocio; aquí se vuelve
a montar sobre el `main` de Vocero.

**Carril**: ligero (Principio VI). Solo interfaz: no toca el modelo de datos,
ni `/api/bot/*`, ni el despacho, ni ningún DTO. Se interpreta «adjuntar
emojis» como insertar caracteres Unicode en el texto o en el pie, con envío
manual.

## Comportamiento

**H1 — El operador inserta un emoji.** Junto al campo de escritura hay un
botón con una cara sonriente («Emojis»). Abre un panel con una búsqueda y
siete categorías (caras, gestos, corazones, celebración, naturaleza, comida y
objetos). Elegir un emoji lo inserta donde está el cursor —o en lugar del
texto seleccionado— y el panel sigue abierto para elegir otro. Nada se envía
hasta que el operador pulse «Enviar» o Enter.

**H2 — Lo encuentra escribiendo.** La búsqueda es en español y no distingue
acentos ni mayúsculas («corazon» encuentra «Corazón rojo»). Sin
coincidencias, el panel lo dice. Pegar el propio emoji en la búsqueda también
lo encuentra.

**H3 — Se cierra como se espera.** Escape, la X o un clic fuera cierran el
panel; Escape y la X devuelven el foco al botón. Abrirlo de nuevo empieza con
la búsqueda vacía.

## Decisiones

**D1 — Catálogo local, Unicode del sistema.** Unos doscientos emojis con su
nombre en español en `src/lib/emojis.ts`; se dibujan con la fuente del
sistema del operador. Sin imágenes, sin biblioteca nueva y sin peticiones a
ningún sitio (Principio II). La búsqueda y la inserción son funciones puras en
el mismo archivo, probadas sin navegador.

**D2 — Donde se puede escribir, en cualquier canal.** El botón vive en la caja
de texto, así que aparece en WhatsApp, Instagram, Messenger y TikTok mientras
haya texto libre. Con la ventana cerrada no hay caja de texto, y tampoco
selector. Con un adjunto elegido, el emoji va al pie.

**D3 — Mientras sube un adjunto, nada cambia.** Durante el envío de un
adjunto, ubicación o contacto (`sending`) el botón se deshabilita y el panel
se cierra: el texto que se está mandando como pie no se toca.

**D4 — El cursor queda detrás del emoji.** Tras insertar, el foco vuelve al
campo con el cursor justo después del emoji, aunque sea un emoji compuesto
(«❤️‍🔥» son cinco unidades UTF-16). Reemplazar un emoji seleccionado por el
mismo no cambia el texto y coloca el cursor igual.

**D5 — Abrir el selector cierra el panel de ubicación o contacto.** Son dos
paneles que compiten por el mismo espacio encima de la caja.

## Qué NO se hace, y por qué

- **Stickers, GIF e imágenes de emoji**: son adjuntos, no texto; piden otro
  tipo de mensaje y, los GIF, un proveedor externo.
- **Reacciones a un mensaje**: es otro tipo de mensaje de la Cloud API; si se
  pide, va en su propia spec.
- **«Usados recientemente»**: obliga a guardar algo por operador; el catálogo
  cabe en dos pantallas.
- **Tonos de piel**: el teclado del sistema ya los ofrece; multiplicarían el
  catálogo por seis.

## Criterios de aceptación

- **AC1** — `filterEmojis` busca sin acentos ni mayúsculas en todo el catálogo
  (la búsqueda manda sobre la categoría), encuentra por el propio emoji y
  devuelve vacío sin coincidencias; `insertAtSelection` inserta en el cursor,
  reemplaza la selección, aguanta selecciones al revés o fuera de rango y deja
  el cursor detrás de un emoji compuesto. Cada emoji y cada nombre aparecen una
  vez. (Unit, `tests/unit/emojis.test.ts`.)
- **AC2** — En la bandeja: el botón abre el panel con el teclado y el foco va a
  la búsqueda; elegir inserta en el cursor y reemplaza la selección; varios
  emojis seguidos sin reabrir; «corazon en llamas» encuentra el compuesto; una
  búsqueda sin resultados lo dice; Escape cierra y devuelve el foco al botón; un
  clic fuera cierra. (E2E, `scripts/e2e-selector-emojis.mjs`.)
- **AC3** — Elegir, buscar o abrir no envía nada a Graph; el texto con emojis
  enviado llega intacto al mock y al hilo. (E2E.)
- **AC4** — Con un adjunto elegido, el emoji va al pie y el adjunto sigue ahí.
  (E2E.)
- **AC5** — Con la ventana de 24 h cerrada no hay botón de emojis. (E2E.)
- **AC6** — En 390 px de ancho el panel cabe en la pantalla, no tapa el campo y
  no hay desplazamiento horizontal. (E2E.)
- **AC7** — Gates: `typecheck`, `lint`, `test`, `build` en verde, con banderas
  apagadas y con `CHANNELS` + `AGENDA`.

## Constitution Check

| Principio | Cómo se cumple |
|---|---|
| I Seguridad | Sin datos nuevos ni secretos; el emoji es texto que pasa por el envío de siempre |
| II Soberanía | Catálogo local, sin dependencias ni peticiones (D1) |
| III Multi-tenancy | No hay consultas nuevas |
| IV Idempotencia | No aplica: no hay escrituras nuevas |
| V Calidad verificable | Unit de búsqueda e inserción; E2E de la bandeja con wa-mock |
| VI Spec antes de código | Este documento, carril ligero |
| VII Trazabilidad | El supuesto («adjuntar emojis» = insertar texto) queda escrito arriba |
| VIII Foco vertical | Es la bandeja: atender como en WhatsApp |
| IX Hecho = probado en vivo | E2E contra la app con mocks; en vivo con un número real queda pendiente del responsable |
