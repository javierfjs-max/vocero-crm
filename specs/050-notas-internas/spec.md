# 050 — Notas internas en el hilo

**Feature Branch**: `feat/050-notas-internas`

**Created**: 2026-10-23

**Status**: Especificada antes de escribir código. Implementada; gates, arnés E2E (28/28) y capturas en claro y oscuro en verde. D7 se agregó al implementar.

**Input**: cuarta spec de la 2.2, elegida por Kevin el 2026-10-23
([046 research.md](../046-referencias-2.2/research.md)). Referencias:

- **Chatwoot (MIT)**, observado en la Fase 1 (`cw-02`, `cw-05`): pestañas
  «Reply / Private Note» sobre la misma caja. La nota se pinta en el hilo con
  fondo ámbar y un candado.
- **DeskcommCRM (MIT)**: `conversation_notes` con tiempo real; solo el autor
  o un gerente la edita.
- **whatsapp-saas (MIT)**: la nota interna como aviso del sistema cuando la IA
  no pudo responder.

No se copia código.

**Carril**: ciclo completo (Principio VI): tabla nueva y dos eventos nuevos
en el SSE (`/api/events`, contrato publicado; agregar eventos cabe).

## Problema

Hoy, para dejarle algo al compañero («ofrécele 5 %», «ya pagó, falta
enviar», «no contestar precios, pasa a Laura»), el equipo usa el campo
**Notas** del panel del contacto. Es uno solo por contacto, se sobrescribe y
no dice quién lo escribió ni cuándo. La conversación pasa en el hilo, y ahí no
hay forma de anotar nada sin que le llegue al cliente.

## Decisiones

**D1 — Una tabla propia, no un tipo de mensaje.**

- `conversation_note`: autor, texto y hora, colgada de la conversación.
- Mezclar notas con `message` pondría en riesgo los guardarraíles:
  - el envío a Meta (`send.ts`);
  - el despacho al cerebro, que arma la ráfaga desde `message`;
  - «sin responder» (025), la ventana de 24 h, los no leídos y las métricas de
    Resultados.
- En una tabla aparte, **ninguna de esas rutas puede ver una nota**: no la
  consultan. Una prueba lo vigila: el código de envío, despacho, bot y
  analítica no menciona la tabla de notas.

**D2 — En el compositor, dos pestañas: «Responder» y «Nota interna».**

- La nota cambia la caja a tono ámbar (tokens de aviso), con el texto
  «Nota interna: solo la ve tu equipo», y sin adjuntos ni micrófono.
- Enter guarda la nota y Shift+Enter hace un salto de línea, igual que al
  responder.
- **La pestaña Nota existe también con la ventana cerrada.** Anotar no
  depende de Meta, y es justo cuando más se necesita («le mandé la plantilla,
  esperar»).

**D3 — En el hilo, la nota se ve distinta de un mensaje.**

- Va a lo ancho, con fondo ámbar, un candado, «Nota interna», el nombre de
  quien la escribió y la hora. Se ordena por su hora entre los mensajes.
- No tiene «responder citando» ni «reenviar».
- Quien la escribió, o quien configura, puede **borrarla** (con
  confirmación). No hay edición: una nota es un registro de lo que alguien
  dijo en su momento.

**D4 — En vivo para todo el equipo.** El SSE gana dos eventos aditivos:
`note.new` (`{ conversationId, note }`) y `note.deleted` (`{ conversationId,
noteId }`). Quien tiene abierta la conversación ve la nota al instante.

**D5 — No toca nada del cliente.**

- Una nota no envía nada a Meta.
- No marca la conversación como respondida, no la mueve en la lista, no abre
  ni cierra la ventana, no cuenta como no leída y no se despacha al cerebro.
- No viaja por `/api/bot/*`. Exponerla a un cerebro es otra decisión, con su
  contrato.

**D6 — Límites.** El texto lleva de 1 a 4 096 caracteres. Las notas se borran
con la conversación (cascada) y con el contacto (026).

**D7 — El campo del panel se llama «Notas del contacto»** (agregado al
implementar). El panel ya tenía «NOTAS», con «Notas internas sobre este
contacto…» y «Guardar notas», y la palabra chocaba con la función nueva.
Ahora se titula «Notas del contacto», con el botón «Guardar notas del
contacto», y su texto de ayuda dice para qué es: lo fijo del cliente; lo de la
conversación va en Nota interna. No cambia nada de los datos.

## Criterios de aceptación

- **AC1 — Escribir.**
  - En «Nota interna» se escribe y Enter guarda.
  - La nota aparece en el hilo con el autor y la hora, y el compositor vuelve
    vacío.
  - **Ningún** mensaje sale al wa-mock.
- **AC2 — No es un mensaje.** Tras la nota, la conversación sigue igual:
  - mismo «último mensaje» y mismo orden en la lista;
  - la ventana no cambia;
  - sin no leídos nuevos;
  - con cerebro, ningún despacho nuevo.
- **AC3 — Ventana cerrada.** Con la ventana de 24 h cerrada, la pestaña Nota
  está y guarda. La de Responder sigue ofreciendo plantillas.
- **AC4 — En vivo.** Otra sesión con la misma conversación abierta ve la nota
  sin recargar.
- **AC5 — Borrar.** El autor la borra y desaparece en las dos sesiones. Un
  miembro que no es el autor recibe 403 al intentarlo. Quien configura puede
  borrar la de otro.
- **AC6 — Organización y validación.**
  - Una conversación de otra organización → 404.
  - Texto vacío → 422.
  - La lista viene por hora.
- **AC7 — Celular.** A 390 px las pestañas y la nota caben sin desplazamiento
  horizontal.

## Qué NO se hace y por qué

- **Editar notas** (D3).
- **Menciones `@persona` con aviso** (Chatwoot): necesitan notificaciones por
  persona, que Vocero aún no tiene.
- **Adjuntos en la nota** (DeskcommCRM): primero el texto.
- **Notas visibles para el cerebro** (D5).
- **Migrar el campo «Notas» del contacto**: sigue donde está. Sirve para
  datos fijos del cliente, no para la conversación.

## Constitution Check

| Principio | Cómo se cumple |
|---|---|
| I · Seguridad | Sin secretos. Las notas no salen del CRM (D5) |
| II · Soberanía | Sin dependencias ni terceros |
| III · Multi-tenancy | `organization_id` NOT NULL; todas las consultas con `scoped()`; la conversación se comprueba de la organización antes de leer o escribir |
| IV · Idempotencia | Crear es un `INSERT` simple; borrar dos veces da 404 |
| V · Hecho | Unitarias, guardarraíl de rutas, arnés E2E con dos sesiones y los cuatro gates |
| VI · Specs | Ciclo completo: esta spec, `plan.md` y `tasks.md` antes del código |
| VII · Trazabilidad | D1 a D6; enmienda aditiva en `contracts/sse.md`; bitácora |
| VIII · Foco | Atender en equipo una conversación de WhatsApp |
| IX · En vivo | El arnés conduce la interfaz real en dos sesiones y comprueba el wa-mock |
| Sandbox | Sin cambio: una nota nunca llega a `send.ts` |
