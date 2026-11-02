# Guion E2E — Ningún mensaje se pierde si su procesamiento falla (047)

> Automatizado en `scripts/e2e-webhook-fallos.mjs` (32 checks: API, base y
> Playwright en Ajustes → WhatsApp, en claro y en oscuro). Spec:
> [047](../../specs/047-webhook-a-prueba-de-fallos/spec.md).

## El fallo original

El webhook respondía 200 y procesaba en `after()`. Si el procesamiento lanzaba
—la base parpadeaba, un redespliegue mataba el proceso—, quedaba una línea en
el log y nada más: Meta ya tenía su 200 y no reenviaba. El cliente escribió y
la bandeja nunca lo supo.

## Cómo se corre

App viva con `WA_MOCK_ENABLED=true`, `WEBHOOK_RETRY_FAST=1` (esperas de 300 ms
en lugar de 30 s…6 h; solo vale con mocks), `META_APP_SECRET` (el guion firma
como Meta), `CHANNELS=whatsapp,instagram,messenger,tiktok` y
`ZERNIO_BASE_URL` → zernio-mock. Luego:

```bash
node --env-file=<env> scripts/e2e-webhook-fallos.mjs
```

Para provocar fallos, `POST /api/dev/webhook-fallo {"veces": n}`: los
siguientes `n` procesamientos lanzan (404 fuera de los mocks).

## Camino verificado

1. **Feliz (AC1).** Un mensaje firmado como Meta → 200 y entra a la bandeja.
   ✅ Ajustes dice 0 pendientes y 0 agotados.
2. **Un fallo (AC2).** Con un fallo inyectado, la ruta responde 200 igual.
   ✅ El fallo se consume, el barrido reintenta y el mensaje entra **una vez**.
3. **Duplicado (AC4).** El mismo cuerpo dos veces → dos 200.
   ✅ Un solo mensaje.
4. **Número ajeno (AC8).** Un `phone_number_id` que nadie conectó → 200.
   ✅ No se guarda ni queda pendiente: se descarta con el aviso de siempre.
5. **Agotado (AC5).** Con seis fallos inyectados, el evento se agota.
   ✅ Ajustes da el conteo y el último error, que no lleva el texto del
   cliente.
   ✅ El mensaje no está en la bandeja.
   ✅ `/api/health` → `webhooks.agotados ≥ 1` con `ok: true`.
   ✅ En Ajustes → WhatsApp, la tarjeta «Entregas» dice «1 entrega no pudo
   entrar a la bandeja» con el error, en claro y en oscuro (capturas en
   `.tmp/`).
   ✅ **Reintentar** → «Entregas al día», el mensaje entra una vez y el health
   vuelve a 0.
6. **Reinicio a media ingesta (AC6).** Se escribe en la base un evento
   `en_proceso` con la reserva vencida.
   ✅ El barrido lo retoma en ≤ 15 s y el mensaje entra.
   ✅ La fila queda `procesado` con 2 intentos.
7. **Instagram por Zernio (AC7).** Un DM firmado con un fallo inyectado.
   ✅ La ruta responde 200 y el DM entra una vez tras el reintento.
8. **Permisos (AC10).** Un miembro sin permiso de configurar.
   ✅ `GET` y `POST /api/settings/webhook/eventos` → 403.

## Lo que no cubre este guion

- **AC3 (base caída → 503).** Lo prueba `tests/unit/webhook-eventos.test.ts`:
  si guardar o resolver la organización lanza, la ruta responde 503 y no
  procesa. Tirar el Postgres de desarrollo a media corrida rompería los demás
  guiones.
- **AC9 (limpieza a los 7 y 30 días).** La consulta es una fila de SQL
  (`purgar` en `src/server/webhooks/eventos.ts`). El guion no espera días.
