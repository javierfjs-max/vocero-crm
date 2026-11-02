# Guion E2E — Borrador por conversación (051)

> Automatizado en `scripts/e2e-borradores.mjs` (19 checks, Playwright). Spec:
> [051](../../specs/051-borrador-por-conversacion/spec.md).

## Por qué

Con tres chats a la vez, lo escrito en uno se perdía al saltar a otro: la 028
(D5) remonta el compositor para que un adjunto no viaje entre conversaciones,
y el texto se iba con él.

## Camino verificado

1. **AC1.** Escribir en A, ir a B (la caja está vacía) y volver a A: el texto
   sigue.
2. **AC2.** La fila de A dice «Borrador: Te confirmo mañana…» y la de B no.
3. **AC3.** Enviar desde A: el mensaje sale, la lista deja de decir «Borrador»
   y al volver no hay nada.
4. **AC4.** Vaciar la caja a mano también lo borra.
5. **AC7.** Responder y Nota interna (050) conservan cada uno el suyo.
6. **AC8.** Un adjunto elegido en A ya no está al volver (028 D5); el texto,
   sí.
7. **AC5.** Un borrador de más de 7 días (puesto en `localStorage`) no se
   restaura y se elimina.
8. **AC6.** «Cerrar sesión» deja el navegador sin ningún borrador.
