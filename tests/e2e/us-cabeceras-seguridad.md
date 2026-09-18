# E2E — Cabeceras de seguridad

Precondición: app corriendo (sirve igual en dev que en producción; las
cabeceras las emite Next, no el proxy).

Cinco cabeceras en **toda** respuesta, definidas en `headers()` de
`next.config.ts`.

## Qué se comprueba

1. `GET /login` (sin sesión) responde con las cinco:
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Strict-Transport-Security: max-age=31536000`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
2. `GET /api/health` responde con las mismas cinco: valen para toda la
   superficie, no solo para las páginas que pasan por el layout autenticado.

## Por qué cada una

- **`X-Frame-Options: DENY`** — el panel no se embebe en ningún sitio. Sin
  esto, cualquier página puede meterlo en un iframe invisible y robar clics
  del operador sobre la bandeja.
- **`X-Content-Type-Options: nosniff`** — un adjunto subido se sirve desde el
  mismo dominio por `/api/media/{id}`. Sin esto, un archivo podría hacerse
  pasar por HTML y ejecutarse en el origen del CRM.
- **`Referrer-Policy`** — las URL del CRM llevan ids de conversación; no
  tienen por qué viajar a otros dominios.
- **`Strict-Transport-Security`** — un año. **Sin `preload` ni
  `includeSubDomains`**: eso lo decide quien opera el dominio, no la app, y
  aquí conviven otros subdominios que no controla este repositorio.
- **`Permissions-Policy`** — la app no usa cámara, micrófono ni
  geolocalización del navegador. La ubicación de WhatsApp se teclea o se pega
  de un enlace de Google Maps, así que negar las tres no quita nada.

## Lo que NO lleva, y por qué

**No hay `Content-Security-Policy`.** Next inyecta scripts y estilos en línea,
así que una CSP útil necesita nonces por petición y su propia ronda de
pruebas. Media CSP rompe la app sin protegerla: es una feature aparte, no un
añadido a ésta.

## Dónde viven

En `next.config.ts`, no en etiquetas del proxy. Dos razones: Coolify regenera
sus etiquetas en cada despliegue —se perderían sin avisar— y en la Ruta B
quien sirve es Caddy, que tampoco las lleva. En el código valen para las dos
rutas y viajan con el repositorio.

## Automatizado

Las diez comprobaciones (5 cabeceras × 2 superficies) las conduce
`scripts/e2e-selftest.mjs` en `cabecerasChecks()`.
