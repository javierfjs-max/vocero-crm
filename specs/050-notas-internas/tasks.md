# Tasks: Notas internas en el hilo

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

- [x] T001 `conversationNote` en `schema.ts`, prefijo `nota`, `pnpm db:generate` → `0025`
- [x] T002 `src/lib/notas.ts` (puro): tipo `NotaDto` e intercalación por hora
- [x] T003 `src/server/notas.ts` + rutas `GET`/`POST /api/conversations/[id]/notes` y `DELETE …/notes/[noteId]`, con `note.new` / `note.deleted` en el bus
- [x] T004 `use-events.ts` (`onNoteNew`, `onNoteDeleted`) y enmienda en `contracts/sse.md`
- [x] T005 Pestañas y caja de nota en `composer.tsx` (en todas las ramas)
- [x] T006 Notas intercaladas en `message-thread.tsx`, con borrar
- [x] T007 `inbox-client.tsx`: cargar, escuchar y crear
- [x] T008 `tests/unit/notas-internas.test.ts` (intercalación, permisos, guardarraíl)
- [x] T009 `tests/e2e/us-notas-internas.md` + `scripts/e2e-notas-internas.mjs`
- [x] T010 Gates en las dos configuraciones, self-test general, capturas de antes y después
- [x] T011 AGENTS.md, `specs/README.md`, bitácora y PR
