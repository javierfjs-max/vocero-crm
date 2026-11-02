# Implementation Plan: Webhook a prueba de fallos

**Branch**: `feat/047-webhook-a-prueba-de-fallos` | **Spec**: [spec.md](spec.md) | **Tareas**: [tasks.md](tasks.md)

## Summary

Las cuatro rutas de entrada guardan el evento crudo en `webhook_event` antes
de responder. Responden 503 si no pudieron guardarlo y lo procesan en el
`after()` de siempre. Un barrido dentro del proceso reintenta los que
fallaron con espera creciente, retoma los que un reinicio dejó a medias y
borra lo viejo. Ajustes → WhatsApp enseña los agotados y los deja reintentar.
`/api/health` los cuenta.

El patrón es el del outbox del despacho (021), que ya es del repo: reclamo
por `UPDATE` condicionado, reserva que vence y reanudación al arrancar. Del
estudio (046) se toma, de `whatsapp-saas` (MIT), la idea de esperar más entre
intentos y de dejar lo agotado a la vista de una persona. No se copia código:
allá el reintento es de lotes de IA sobre Supabase y pg_cron.

## Technical Context

- **Stack**: Next.js 15, TypeScript estricto, Drizzle + PostgreSQL, Vitest.
- **Dependencias nuevas**: ninguna (`node:crypto` para la huella).
- **Trabajo en segundo plano**: un `setInterval` de 10 s dentro del proceso,
  en `globalThis` como el worker del despacho (en dev los módulos se evalúan
  más de una vez). Arranca en `instrumentation-node.ts`.
- **Rendimiento**:
  - Recibir cuesta una consulta para resolver la organización (las mismas que
    ya hace la ingesta) y un `INSERT … ON CONFLICT DO NOTHING`.
  - El barrido es una consulta por índice parcial. Si no hay nada pendiente,
    no devuelve filas.
  - La limpieza corre como mucho una vez por hora.

## Modelo de datos

Migración aditiva `0023_webhook_event.sql` (generada con `pnpm db:generate`).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | text PK | prefijo `whe` |
| `organization_id` | text NOT NULL → `organization` (cascade) | resuelto al recibir (D6) |
| `fuente` | text enum `whatsapp`, `meta_instagram`, `meta_messenger`, `zernio` | decide quién lo procesa |
| `payload` | jsonb NOT NULL | el cuerpo tal como llegó, ya parseado |
| `huella` | text NOT NULL, **UNIQUE** | SHA-256 hex del cuerpo crudo (D4) |
| `status` | text enum `pendiente`, `en_proceso`, `procesado`, `agotado` | default `pendiente` |
| `attempts` | integer NOT NULL default 0 | sube al reclamar |
| `not_before` | timestamp NOT NULL default now | la siguiente hora de intento |
| `leased_until` | timestamp | reserva mientras se procesa |
| `last_error` | text | mensaje de la excepción, ≤300 caracteres, sin cuerpo |
| `processed_at` | timestamp | |
| `created_at`, `updated_at` | timestamp NOT NULL | |

Índices:

- `webhook_event_huella_uq` (único).
- `webhook_event_barrido_idx` sobre `(status, not_before)` con
  `WHERE status in ('pendiente','en_proceso')`: el barrido solo lee eso.
- `webhook_event_org_status_idx` sobre `(organization_id, status)`: los
  conteos de Ajustes.

Una instalación vieja actualiza sin pasos manuales: es una tabla nueva y
vacía.

## Diseño

```
ruta (wa|ig|messenger|tiktok)
  valida token + firma (sin cambios)
  → recibirEvento(fuente, payload, rawBody)      src/server/webhooks/recibir.ts
       resolverOrganizacion(fuente, payload)     src/server/webhooks/organizacion.ts
         sin organización → { guardado: false }  → after(procesar como hoy)
       guardarEvento → INSERT … ON CONFLICT (huella) DO NOTHING
         lanza → la ruta responde 503
  → 200 y after(procesarEvento(id))              src/server/webhooks/worker.ts
       tomarEvento(id) → UPDATE condicionado (pendiente → en_proceso, attempts+1)
       procesarFuente(fuente, payload)           src/server/webhooks/procesar.ts
       ok → procesado | lanza → reintentarOAgotar(espera de la tabla D2)
barrido cada 10 s (instrumentation-node)
  tomarPendientes: pendiente vencido o en_proceso con reserva vencida
  purgar (≤ 1/h): procesado > 7 d, agotado > 30 d
```

- **`procesar.ts`** reúne los cuatro procesadores que hoy viven repartidos en
  las rutas:
  - el `processPayload` de WhatsApp, que hoy es una función privada de su
    `route.ts`, se mueve aquí;
  - `processMetaInstagramPayload`;
  - `processMetaPagePayload`;
  - `processZernioPayload`.
  Las rutas solo validan y llaman a `recibirEvento`.
- **Espera** (pura, `esperaDeReintento(intentos)`): `[30 s, 2 min, 10 min,
  1 h, 6 h]`, `MAX_INTENTOS = 6`. Lleva una variación al azar de hasta +30 %,
  como `reintentarOCaducar` del despacho.
- **Reserva**: `LEASE_MS = 120 000`. La ingesta de un payload rara vez pasa de
  unos segundos: los adjuntos se descargan aparte.
- **Ajustes**: `GET /api/settings/webhook/eventos` devuelve
  `{ pendientes, agotados, ultimoError, ultimoFalloEn }`.
  `POST /api/settings/webhook/eventos` (`{ accion: "reintentar" }`) pasa los
  agotados de la organización a pendientes con `attempts = 0` y despierta al
  barrido. Las dos rutas exigen `canConfigure` (403) y usan `scoped()`.
- **Interfaz**: tarjeta «Entregas» en Ajustes → WhatsApp, debajo del webhook.
  Dice «Entregas al día» o, con agotados, avisa en tono de peligro con el
  conteo, la hora, el error y **Reintentar**. Los pendientes se cuentan en
  tono de aviso («N en reintento»). Solo tokens de `globals.css`.
- **Health**: `webhooks: { pendientes, agotados }` en `HealthOk`. Si la
  consulta falla, la llave sale en `null`: no tumba el health.
- **Fallo de prueba** (solo con mocks): `POST /api/dev/webhook-fallo
  { veces: n }` hace que los siguientes `n` procesamientos lancen. Va tras
  `dev-guard`, con 404 en producción, y el estado vive en memoria en
  `src/server/dev/`. Lo usa el arnés E2E para AC2 y AC5.

## Contrato del webhook (enmienda)

`specs/001-vocero-core/contracts/webhook.md`, punto 3. Antes decía «200
SIEMPRE tras encolar/procesar, nunca 5xx». Pasa a decir: «200 tras guardar el
evento; **503 solo si no se pudo guardar**, para que la fuente reintente;
nunca 5xx por un error al procesar». AGENTS.md («Webhooks de entrada») se
actualiza igual.

## Constitution Check

Antes del diseño y después: sin violaciones.

| Principio | Evaluación |
|---|---|
| I | El payload no trae credenciales. Retención de 7 y 30 días; nunca a logs ni a la API; solo lo ve quien configura |
| II | Sin dependencias ni terceros; una tabla y un temporizador en el proceso |
| III | `organization_id` NOT NULL, resuelto antes de guardar; `scoped()` en Ajustes |
| IV | Huella única; reclamo por `UPDATE` condicionado a estado e intentos; la ingesta deduplica por `wa_message_id` |
| VI | Ciclo completo por tabla nueva y contrato enmendado |
| Contratos | `/api/bot/*` y el despacho no cambian. `/api/health` gana una llave. El webhook cambia solo en el caso «no se pudo guardar» |
| Sandbox | Sin cambio: la ingesta del webhook nunca crea conversaciones `is_test` |

## Pruebas

- **Unitarias** (`tests/unit/webhook-eventos.test.ts`):
  - espera y tope;
  - huella estable;
  - organización resuelta por fuente, con buscadores inyectados;
  - `recibirEvento` sin organización o con un guardado que lanza;
  - guardarraíl: ninguna ruta de `src/app/api/webhooks/` usa `after(` sin
    pasar por `recibirEvento`.
- **Arnés** `scripts/e2e-webhook-fallos.mjs` contra la app con mocks:
  - AC1 (feliz);
  - AC2 (un fallo inyectado, entra a la siguiente);
  - AC4 (duplicado);
  - AC5 (seis fallos → agotado → Ajustes lo enseña con Playwright → Reintentar
    → entra), con la espera acortada por `WEBHOOK_RETRY_FAST=1`, que solo vale
    con mocks;
  - AC6 (fila en proceso con reserva vencida, puesta en la base);
  - AC8;
  - AC10;
  - AC7 (Instagram por Meta, con `CHANNELS`).
- **Guion** `tests/e2e/us-webhook-fallos.md`.
- **Capturas** de la tarjeta en claro y oscuro (`scripts/screenshots.mjs`).
  `tests/unit/contraste-temas.test.ts` en verde.
