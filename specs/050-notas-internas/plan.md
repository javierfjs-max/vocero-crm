# Implementation Plan: Notas internas en el hilo

**Branch**: `feat/050-notas-internas` | **Spec**: [spec.md](spec.md) | **Tareas**: [tasks.md](tasks.md)

## Summary

Una tabla `conversation_note` y una API de notas por conversación. El SSE
emite `note.new` y `note.deleted`. El compositor gana la pestaña «Nota
interna», también con la ventana cerrada, y el hilo intercala las notas por
hora. Nada de esto pasa por `message`, `send.ts`, el despacho ni la
analítica.

## Modelo de datos

Migración aditiva `0025_conversation_note.sql`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | text PK | prefijo `nota` |
| `organization_id` | text NOT NULL → `organization` (cascade) | |
| `conversation_id` | text NOT NULL → `conversation` (cascade) | se va con la conversación (026) |
| `author_user_id` | text → `user` (set null) | si se borra la cuenta, la nota queda como «Alguien del equipo» |
| `texto` | text NOT NULL | 1 a 4 096 caracteres |
| `created_at` | timestamp NOT NULL | |

Índice: `conversation_note_conv_idx (organization_id, conversation_id, created_at)`.

## API (interna) y SSE (contrato, aditivo)

| Método | Ruta | Quién | Qué |
|---|---|---|---|
| GET | `/api/conversations/[id]/notes` | sesión | `{ notas: NotaDto[] }` por hora; 404 si la conversación no es de la organización |
| POST | `/api/conversations/[id]/notes` | sesión | `{ texto }` → 201 `{ nota }`; publica `note.new` |
| DELETE | `/api/conversations/[id]/notes/[noteId]` | autor o `canConfigure` | 204; publica `note.deleted`; 403 si no es el autor ni configura |

`NotaDto = { id, conversationId, texto, createdAt, autor: { id, nombre } | null, puedeBorrar }`.
`puedeBorrar` se calcula para quien pide.

`specs/001-vocero-core/contracts/sse.md` gana los dos eventos.

## Interfaz

- `composer.tsx`: prop `onNota?: (texto) => Promise<string | null>`. Con
  ella, pestañas «Responder | Nota interna» encima de **todas** las ramas
  (ventana abierta, cerrada con plantillas, ventana humana o TikTok cerrada).
  En modo nota, una caja propia: tokens `warning-*`, textarea, Enter guarda,
  Escape vuelve a Responder.
- `message-thread.tsx`: prop `notas?: NotaDto[]` y `onBorrarNota?`. Cada nota
  se pinta antes del primer mensaje posterior a su hora, y las que quedan
  después del último mensaje, al final.
- `inbox-client.tsx`: carga las notas al elegir una conversación, escucha
  `note.new` / `note.deleted` y pasa `onNota` al compositor.
- `use-events.ts`: `onNoteNew` y `onNoteDeleted`.

## Pruebas

- **Unitarias** (`tests/unit/notas-internas.test.ts`):
  - la intercalación por hora (pura, `src/lib/notas.ts`);
  - `puedeBorrar`;
  - el guardarraíl: `src/server/{dispatch,brains,bot,analytics}/**` y
    `src/server/inbox/send.ts` no mencionan `conversationNote`.
- **Arnés** `scripts/e2e-notas-internas.mjs`, con dos contextos de Playwright:
  - escribir;
  - wa-mock sin envíos;
  - la lista y la ventana sin cambio;
  - ventana cerrada;
  - en vivo en la otra sesión;
  - borrar, con el 403 de un miembro no autor;
  - 422, 404 y 390 px.
- **Guion** `tests/e2e/us-notas-internas.md`.
- **Capturas** de antes y después, en claro y oscuro.
