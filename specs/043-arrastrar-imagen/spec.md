# 043 — Arrastrar una imagen desde la computadora al chat

**Feature Branch**: `043-arrastrar-imagen`

**Created**: 2026-10-22

**Status**: Especificada antes de escribir código.

**Input**: el mismo negocio que pidió la 042 pidió también poder arrastrar una
imagen desde el escritorio o el explorador de archivos y soltarla en el chat,
como en WhatsApp Web. La función ya funciona en el CRM de ese negocio; aquí se
vuelve a montar sobre el `main` de Vocero.

**Depende de la 042** (pegar y reenviar imágenes): reutiliza su validación
(`validarImagenAdjunta`) y toca el mismo compositor. La rama sale de
`042-pegar-reenviar-imagenes` y su PR, contra `main`, enseña también los
commits de la 042 hasta que esa entre.

**Carril**: ligero (Principio VI). Solo interfaz: no toca el modelo de datos,
ni `/api/bot/*`, ni el despacho, ni ningún DTO. El envío es el de siempre
(`POST …/messages/media`).

## Comportamiento

**H1 — Soltar una imagen la adjunta.** Al arrastrar un archivo sobre el hilo o
el compositor de una conversación que admite adjuntos, el área del chat enseña
«Suelta la imagen para adjuntarla». Al soltar una imagen JPEG/PNG/WebP de hasta
5 MB, queda como adjunto con su vista previa, igual que con el clip o al
pegarla: se le puede escribir un pie, quitarla o mandarla. Soltar no envía.

**H2 — Lo que no sirve se dice y no pisa nada.** Un archivo que no es imagen
compatible, varios archivos o uno de más de 5 MB enseñan el motivo; el texto y
el adjunto que ya estaban se quedan.

## Decisiones

**D1 — Misma validación que el pegado.** `validarImagenAdjunta(files, "drop")`
(042): una imagen, JPEG/PNG/WebP, 5 MB. Los mensajes dicen «Arrastra…» en vez
de «Pega…».

**D2 — Solo arrastres de archivos.** El área reacciona si el arrastre trae
`Files`; arrastrar texto o un enlace dentro de la página sigue igual (se puede
soltar texto en el campo, como siempre).

**D3 — El indicador no parpadea.** Entrar y salir de los elementos de dentro
(burbujas, botones) dispara `dragenter`/`dragleave` en cascada; se lleva una
cuenta de profundidad y el indicador solo se va al salir del área o al soltar.

**D4 — Soltar fuera del chat no saca al operador del CRM.** Sin esto, el
navegador abre el archivo en la pestaña y el CRM se pierde (con el borrador).
Mientras haya una conversación abierta, soltar un archivo en cualquier otro
punto de la página no hace nada. (Añadido sobre lo que hacía el CRM de origen,
que solo lo evitaba dentro del área.)

**D5 — Cuándo no se acepta.** Mientras sube un adjunto (`sending`), con la
ventana cerrada (no hay compositor de texto libre) o en un canal sin adjuntos
(`composer.media`, hoy todo lo que no es WhatsApp), el indicador no aparece y
soltar explica por qué, sin adjuntar. Con el diálogo de reenviar imagen (042)
abierto, soltar no adjunta nada al compositor de atrás.

**D6 — El área es la conversación entera.** El hilo pasa a renderizarse dentro
del compositor (`children`), que es quien sabe si se puede adjuntar; la
disposición no cambia. Cambiar de conversación limpia el indicador (el
compositor tiene llave por conversación).

## Qué NO se hace, y por qué

- **Varias imágenes, carpetas, documentos o videos**: una imagen a la vez,
  como el pegado; el clip sigue sirviendo para el resto.
- **Arrastrar una imagen de otra página web** (un `<img>` de otro sitio): trae
  una URL, no el archivo; habría que descargarla de un tercero.
- **Enviar al soltar**: el operador siempre confirma.

## Criterios de aceptación

- **AC1** — `validarImagenAdjunta(…, "drop")` dice «Arrastra una imagen a la
  vez.» y «Arrastra una imagen JPEG, PNG o WebP.». (Unit, ya en
  `tests/unit/forward-image.test.ts`.)
- **AC2** — Arrastrar un archivo sobre el hilo enseña el indicador; pasar por
  elementos de dentro no lo quita; salir del área sí. (E2E,
  `scripts/e2e-arrastrar-imagen.mjs`.)
- **AC3** — Soltar una imagen sobre el hilo o sobre el campo la adjunta con
  vista previa y conserva el texto escrito, sin enviar; con pie y Enviar llega
  a Graph y al hilo. (E2E.)
- **AC4** — Soltar un PDF, dos imágenes o una de más de 5 MB avisa y no pisa el
  adjunto ni el pie. (E2E.)
- **AC5** — Mientras sube un adjunto, soltar otro no lo reemplaza. (E2E.)
- **AC6** — Con la ventana cerrada, soltar avisa y no adjunta. (E2E.)
- **AC7** — Soltar un archivo fuera del área (en la lista de conversaciones) no
  cambia de página. Arrastrar texto no enseña el indicador. (E2E.)
- **AC8** — Gates: `typecheck`, `lint`, `test`, `build` en verde, con banderas
  apagadas y con `CHANNELS` + `AGENDA`.

## Constitution Check

| Principio | Cómo se cumple |
|---|---|
| I Seguridad | El archivo pasa por la misma validación y la misma ruta de envío que el clip |
| II Soberanía | Sin terceros; no se descargan imágenes de otros sitios |
| III Multi-tenancy | No hay consultas nuevas |
| IV Idempotencia | Soltar no envía; el envío es el de siempre, con su guarda de doble clic (042) |
| V Calidad verificable | E2E de la bandeja con wa-mock; la validación ya tiene unit |
| VI Spec antes de código | Este documento, carril ligero |
| VII Trazabilidad | D4 deja escrito lo que se añadió sobre el original |
| VIII Foco vertical | Atender más rápido |
| IX Hecho = probado en vivo | E2E contra la app con mocks; en vivo con un número real queda pendiente del responsable |
