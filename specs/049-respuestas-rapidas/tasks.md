# Tasks: Respuestas rápidas con «/»

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

- [x] T001 `quickReply` en `schema.ts`, prefijo `qr` en `ids.ts`, `pnpm db:generate` → `0024`
- [x] T002 `src/lib/respuestas-rapidas.ts` (puro): normalizar, token, filtrar, aplicar, rellenar
- [x] T003 `src/server/quick-replies.ts` + rutas `GET`/`POST /api/quick-replies` y `PATCH`/`DELETE /api/quick-replies/[id]`
- [x] T004 Menú `quick-reply-menu.tsx` y su integración en `composer.tsx`
- [x] T005 Ajustes → Respuestas rápidas (página + cliente) y entrada en `nav.ts`
- [x] T006 Semilla demo con cuatro respuestas, idempotente
- [x] T007 `tests/unit/respuestas-rapidas.test.ts`
- [x] T008 `tests/e2e/us-respuestas-rapidas.md` + `scripts/e2e-respuestas-rapidas.mjs`
- [x] T009 Gates en las dos configuraciones, self-test general, capturas de antes y después en claro y oscuro
- [x] T010 AGENTS.md, `specs/README.md`, bitácora y PR
