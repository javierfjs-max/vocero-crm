# 048 — Vocero en el celular (PWA)

**Feature Branch**: `feat/048-pwa` (sobre `feat/047-webhook-a-prueba-de-fallos`, #147)

**Created**: 2026-10-23

**Status**: Especificada antes de escribir código. Implementada; gates, arnés E2E (36/36), self-test general (280/280), prueba en la imagen Docker y capturas en claro y oscuro en verde. D5 cambió al implementar: «Instalar app» es una fila del menú encima de Ajustes, no un icono en el pie (apretaba el nombre del usuario).

**Input**: segunda spec de la 2.2, elegida por Kevin el 2026-10-23 en
[046 research.md](../046-referencias-2.2/research.md), sección «PWA: qué
entra al núcleo y qué no». Referencias observadas: Chatwoot (MIT), que tiene un
`manifest.json` y un service worker de 35 líneas solo para push, y
DeskcommCRM (MIT), con `app/manifest.ts`.

**Carril**: ligero (Principio VI). No toca el modelo de datos ni ningún
contrato publicado: suma rutas públicas de solo lectura (el manifest y el
icono) y un archivo estático.

## Problema

1. **El dueño atiende desde el celular, pero Vocero vive en una pestaña.**
   Para contestar tiene que abrir el navegador, buscar la pestaña entre
   otras veinte y volver a entrar. WhatsApp está a un toque en la pantalla de
   inicio; el CRM que lo atiende, no.
2. **Sin manifest, el navegador no ofrece instalarlo.** Chrome y Edge no
   muestran «Instalar», y en el iPhone «Agregar a inicio» deja un recorte de
   la página como icono.
3. **Cinco instancias instaladas se verían iguales** si el icono fuera el de
   Vocero: una agencia instala la de cada cliente en su propio celular.

## Decisiones

**D1 — Manifest con la marca de la organización.** `src/app/manifest.ts` lo
arma en cada petición con la marca guardada (nombre y logo o inicial): nada de
«Vocero» cableado. Lleva:

- `display: "standalone"` y `start_url: "/inbox"`: la app instalada abre en la
  Bandeja. Primero fue `/`, que según el estado manda a la guía de inicio;
  Kevin lo probó en Android el 2026-10-23 y pidió la Bandeja;
- `scope: "/"` e `id: "/"`;
- `lang: "es"`;
- color de fondo y de tema: el azul marino de la barra lateral, igual en los
  dos temas.

Es público, como el favicon (028): el navegador lo pide sin sesión.

**D2 — Iconos PNG generados en el servidor, sin dependencias.** Chrome pide
iconos de 192 y 512 px para ofrecer la instalación, y el iPhone necesita un
PNG de 180 px para «Agregar a inicio». `GET /api/branding/app-icon` los dibuja
con `ImageResponse` de `next/og`, que ya viene dentro de Next con su propia
fuente: sin `sharp` en el núcleo y sin red. Recibe tres parámetros:

- `size`: 180, 192 o 512 (cualquier otro → 400);
- `purpose`: `any` o `maskable` (con margen de seguridad, para Android);
- `v`: el mismo sufijo de caché del favicon (`faviconCacheKey`).

Lo que se dibuja:

- **Con logo subido** (PNG, JPEG o SVG), el logo centrado sobre el color de
  marca. Un ICO o un WEBP no se pueden dibujar en `ImageResponse`: con esos
  formatos cae a la inicial.
- **Sin logo**, el mismo icono generado que la pestaña: la V de Vocero si la
  instancia se llama Vocero, y la inicial sobre el acento si se llama de otra
  forma.

Las mismas cabeceras de seguridad que el favicon.

**D3 — Un service worker mínimo, que no guarda datos.** `public/sw.js` hace
tres cosas y nada más:

1. se activa enseguida;
2. si una **navegación** falla porque no hay red, responde una página «Sin
   conexión» escrita dentro del propio service worker;
3. todo lo demás (API, SSE, adjuntos, assets) pasa directo a la red sin tocarse.

No hay caché de páginas ni de datos de clientes en el celular: un CRM que
muestra conversaciones viejas como si fueran actuales es peor que uno que dice
«sin conexión». La página de sin conexión no lleva el nombre de nadie
(white-label) y respeta el tema del sistema.

**D4 — Se registra en el layout raíz.** Un componente cliente registra
`/sw.js` al cargar. Si el navegador no tiene service worker (o falla el
registro), no pasa nada: Vocero funciona igual en la pestaña.

**D5 — «Instalar app» en el menú.** Encima de Ajustes aparece una fila
**Instalar app** (al implementar se descartó el icono junto a la campana: con
cuatro iconos el nombre del usuario quedaba en «Du…»). La fila:

- solo aparece cuando el navegador lo permite (evento `beforeinstallprompt`,
  es decir, Chrome, Edge y Android);
- abre el diálogo nativo;
- no aparece si la app ya está instalada (`display-mode: standalone`).

En el iPhone (Safari no tiene ese evento) no se ofrece nada: se instala con
Compartir → «Agregar a inicio» y la guía lo dice (README, «En el celular»).

**D6 — Sin Web Push.** Las notificaciones con la app cerrada pasan por el
servicio de push del navegador (Google, Apple, Mozilla). Es un tercero en el
camino, y por el Principio II solo podría entrar como conector opcional tras
bandera. Queda fuera de la 2.2, como decidió Kevin. Con la app abierta siguen
funcionando el sonido y el contador de la 045.

## Comportamiento observable y criterios de aceptación

- **AC1 — Manifest.** `GET /manifest.webmanifest` sin sesión → 200
  `application/manifest+json`, con:
  - `name` igual al nombre de la marca y `short_name` de ≤ 12 caracteres;
  - `display: standalone`, `start_url: "/inbox"`;
  - iconos 192 y 512 (`any`) y 512 (`maskable`).

  Al cambiar el nombre en Ajustes → Marca, el manifest siguiente lo trae.
- **AC2 — Iconos.** Cada icono del manifest responde 200 `image/png` con el
  tamaño exacto. Un `size` no admitido → 400. Hay respuesta con logo subido y
  sin él.
- **AC3 — iPhone.** El HTML trae `apple-touch-icon` (PNG 180),
  `apple-mobile-web-app-capable` y el título de la marca.
- **AC4 — Instalable.** En Chromium, con la app servida, el service worker
  queda activo, el manifest se lee sin errores (`Page.getAppManifest` no
  devuelve errores) y el navegador lo da por instalable.
- **AC5 — Sin conexión.** Con el service worker activo y la red cortada, una
  navegación muestra «Sin conexión» con un botón para reintentar. Las llamadas
  a `/api/*` no pasan por el service worker (siguen fallando como fallan hoy,
  sin respuesta inventada).
- **AC6 — Botón Instalar.** Aparece en el menú solo después de
  `beforeinstallprompt`. Al usarlo se llama a `prompt()` y luego desaparece.
- **AC7 — Nada en caché.** El service worker no abre ningún `caches.open` ni
  guarda respuestas.

## Qué NO se hace y por qué

- **Web Push** (D6).
- **Modo sin conexión con datos**: la bandeja guardada en el celular. Sería
  mostrar como actual lo que ya no lo es, y dejar datos de clientes en un
  dispositivo que se puede perder.
- **Pantalla propia de «Agregar a inicio» para iPhone**: Safari no da forma
  de hacerlo desde la página; basta con la indicación en la guía.
- **Iconos por canal o por tema**: uno por instancia, con su marca.

## Constitution Check

| Principio | Cómo se cumple |
|---|---|
| I · Seguridad | El manifest y el icono no llevan nada que no sea ya público (nombre y logo, como el favicon). El service worker no guarda datos. El icono subido se sirve con la misma CSP y `nosniff` |
| II · Soberanía | Sin dependencias ni terceros: `next/og` viene con Next y trae su fuente. Sin push |
| III · Multi-tenancy | Lee la marca con `getBrandingContext`, igual que el favicon; no hay consultas nuevas por organización |
| IV · Idempotencia | Solo lectura |
| V · Hecho | Unitarias (tamaños, `short_name`, el service worker no cachea), arnés con Playwright y CDP, los cuatro gates |
| VI · Specs | Este documento, antes del código; carril ligero |
| VII · Trazabilidad | D1 a D6; bitácora al cerrar |
| VIII · Foco | Atender WhatsApp desde el celular |
| IX · En vivo | Arnés contra la app: manifest, iconos, instalable, sin conexión y botón |
