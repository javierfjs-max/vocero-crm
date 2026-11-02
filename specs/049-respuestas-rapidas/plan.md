# Implementation Plan: Respuestas rápidas con «/»

**Branch**: `feat/049-respuestas-rapidas` | **Spec**: [spec.md](spec.md) | **Tareas**: [tasks.md](tasks.md)

## Summary

Una tabla `quick_reply` por organización, una API de lectura para todo el
equipo y de escritura para quien configura, una pantalla en Ajustes y un
menú en el compositor que aparece con `/`. La lógica del menú (encontrar el
`/atajo` antes del cursor, filtrar y reemplazar) es pura y vive en
`src/lib/respuestas-rapidas.ts`, para probarla sin navegador.

## Technical Context

- **Stack**: Next.js 15, TypeScript estricto, Drizzle + PostgreSQL, Vitest y
  Playwright para el arnés.
- **Dependencias nuevas**: ninguna.
- **Rendimiento**: el compositor pide la lista una vez por conversación
  abierta (máximo 200 filas, de algunos KB) y filtra en el cliente.

## Modelo de datos

Migración aditiva `0024_quick_reply.sql`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | text PK | prefijo `qr` |
| `organization_id` | text NOT NULL → `organization` (cascade) | |
| `atajo` | text NOT NULL | normalizado: minúsculas, `[a-z0-9_-]{1,32}`, sin acentos |
| `texto` | text NOT NULL | 1 a 4 096 caracteres |
| `created_at`, `updated_at` | timestamp NOT NULL | |

Índice único `quick_reply_org_atajo_uq (organization_id, atajo)`.

## API (interna, no es contrato publicado)

| Método | Ruta | Quién | Qué |
|---|---|---|---|
| GET | `/api/quick-replies` | cualquiera con sesión | `{ respuestas: [{ id, atajo, texto }] }`, por atajo |
| POST | `/api/quick-replies` | `canConfigure` | 201; 409 `duplicado`; 422; 409 `tope` con 200 |
| PATCH | `/api/quick-replies/[id]` | `canConfigure` | 200; 404 si no es de la organización; 409 `duplicado` |
| DELETE | `/api/quick-replies/[id]` | `canConfigure` | 204; 404 |

La lógica vive en `src/server/quick-replies.ts`; las rutas solo exportan
handlers.

## Interfaz

- `src/components/inbox/quick-reply-menu.tsx`: un popover encima de la caja,
  con la lista (el atajo en mono y el texto recortado a dos líneas), la fila
  activa resaltada y `role="listbox"` / `option`. A 390 px ocupa el ancho del
  compositor.
- `composer.tsx`:
  - en cada cambio o movimiento del cursor calcula `tokenRapido(text, caret)`;
  - si hay token, abre el menú;
  - `onKeyDown` intercepta ↑, ↓, Enter, Tab y Escape mientras el menú está
    abierto;
  - Enter sin menú envía, como siempre.
- `src/app/(app)/settings/quick-replies/page.tsx` +
  `src/components/settings/quick-replies-client.tsx`: lista con crear,
  editar en línea y borrar con confirmación.
- `src/lib/nav.ts`: «Respuestas rápidas» en «Negocio», después de Plantillas.

## Constitution Check

Antes y después del diseño: sin violaciones (ver la tabla del spec).

## Pruebas

- **Unitarias** (`tests/unit/respuestas-rapidas.test.ts`):
  - `normalizarAtajo`;
  - `tokenRapido` (inicio, tras espacio, `3/4`, URL, cursor en medio);
  - `filtrarRespuestas` (prefijo antes que contenido, sin acentos);
  - `aplicarRespuesta` (reemplazo y cursor);
  - `rellenarVariables` (`{nombre}` con y sin nombre).
- **Arnés** `scripts/e2e-respuestas-rapidas.mjs`: API (crear, normalizar,
  409, 422, 403 de un miembro, aislamiento), el compositor real con
  Playwright (`/`, filtro, teclado, `{nombre}`, que no se envía solo, en
  medio del texto, Escape, vacío) y a 390 px.
- **Guion** `tests/e2e/us-respuestas-rapidas.md`.
- **Capturas** de antes y después del compositor, y de Ajustes, en claro y
  oscuro.
