# 040 — Ligas clicables en los mensajes

**Feature Branch**: `040-ligas-clicables`

**Created**: 2026-10-22

**Status**: Especificada antes de escribir código.

**Input**: un negocio que ya usa la bandeja en producción pidió que las ligas
de los mensajes se puedan abrir. Hoy una URL en el texto de un mensaje (la
liga de un mapa con la dirección, la de un pago, la de un catálogo) se pinta
como texto plano: el operador tiene que seleccionarla, copiarla y pegarla en
otra pestaña. La función ya funciona en el CRM de ese negocio; aquí se vuelve
a montar sobre el `main` de Vocero, sin sus datos.

**Carril**: ligero (Principio VI). Solo interfaz: no toca el modelo de datos,
ni `/api/bot/*`, ni el despacho, ni el DTO del mensaje.

## Problema

El operador ve «https://maps.example.com/abc» en la burbuja y no puede hacer
clic. Pasa en lo que escribe el cliente, en lo que manda el cerebro y en el
pie de un adjunto.

## Comportamiento

**H1 — Una URL en un mensaje se abre con un clic.** En el texto de cualquier
mensaje (entrante o saliente, de texto o de plantilla) y en el pie de un
adjunto, cada URL se pinta como enlace subrayado con el color de enlace del
tema. Al hacer clic se abre en una pestaña nueva y la bandeja se queda donde
estaba.

## Decisiones

**D1 — Solo `http://`, `https://` y `www.`.** Nada de `mailto:`, `tel:`,
`ftp:`, `data:` ni `javascript:`: el texto lo escribe un tercero (el cliente)
y la bandeja no puede convertirlo en algo que se ejecute o abra otra
aplicación. Una liga que empieza con `www.` se abre como `https://`.

**D2 — La puntuación que cierra la frase no entra en la liga.** «Mira
https://example.com/a.» enlaza `https://example.com/a`. Un `)` final solo es de
la liga si abre dentro de ella (`…/Martillo_(herramienta)`); en «(ver
https://example.com/a).» el paréntesis se queda fuera.

**D3 — El enlace no filtra nada.** `target="_blank"` con
`rel="noopener noreferrer nofollow"`: la pestaña nueva no puede tocar la
bandeja (`window.opener`) ni recibe de qué URL del CRM viene.

**D4 — El texto no cambia.** Los tramos se pintan tal cual: unidos dan
exactamente el texto guardado. No se acortan ligas ni se piden vistas
previas a ningún sitio (eso sería tráfico a terceros desde la bandeja).

**D5 — El color es el token de enlace del tema** (`text-brand-ink`, que
`tests/unit/contraste-temas.test.ts` ya mide ≥ 4,5:1 sobre el fondo y sobre la
burbuja saliente en los dos temas).

## Qué NO se hace, y por qué

- **Correos y teléfonos clicables** (`mailto:`, `tel:`): no se pidieron, y
  detectar un teléfono en texto libre da falsos positivos con montos y folios.
- **Vista previa de la liga** (título, imagen): obliga a pedir la página a un
  tercero, que es una dependencia de runtime nueva (Principio II).
- **Ligas en el compositor** mientras se escribe: el texto del compositor es
  un `textarea`.
- **Ligas sin esquema ni `www.`** («example.com»): demasiados falsos
  positivos («v1.6», «archivo.pdf»).

## Criterios de aceptación

- **AC1** — `splitLinks` reconoce `http(s)://` y `www.`, completa `https://`,
  deja fuera la puntuación y el paréntesis de cierre, respeta los paréntesis
  internos, ignora otros esquemas y unidos los tramos devuelven el texto
  original. (Unit, `tests/unit/linkify.test.ts`.)
- **AC2** — En la bandeja, un entrante con una URL en el texto se pinta con un
  `<a>` con esa URL, `target="_blank"` y `rel` con `noopener` y `noreferrer`;
  el texto alrededor sigue igual. (E2E, `scripts/e2e-ligas-clicables.mjs`.)
- **AC3** — Igual en el pie de un adjunto y en un saliente del operador. (E2E.)
- **AC4** — `javascript:` y `mailto:` en un mensaje no producen ningún enlace.
  (E2E.)
- **AC5** — Gates: `typecheck`, `lint`, `test`, `build` en verde, con banderas
  apagadas y con `CHANNELS` + `AGENDA`.

## Constitution Check

| Principio | Cómo se cumple |
|---|---|
| I Seguridad | D1 y D3: ningún esquema ejecutable, sin `opener` ni `referer` |
| II Soberanía | Sin terceros: no se piden vistas previas (D4) |
| III Multi-tenancy | No hay consultas nuevas |
| IV Idempotencia | No aplica: no hay escrituras |
| V Calidad verificable | Unit de `splitLinks` y E2E de la bandeja con wa-mock |
| VI Spec antes de código | Este documento, carril ligero |
| VII Trazabilidad | «Qué NO se hace» deja escrito lo descartado |
| VIII Foco vertical | Es la bandeja: atender más rápido |
| IX Hecho = probado en vivo | E2E contra la app con mocks; en vivo con un número real queda pendiente del responsable |
