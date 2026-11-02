# Guion E2E — Notas internas en el hilo (050)

> Automatizado en `scripts/e2e-notas-internas.mjs` (28 checks, con dos
> sesiones de Playwright a la vez: la dueña y Laura, del equipo). Spec:
> [050](../../specs/050-notas-internas/spec.md).

## Por qué

Para dejarle algo al compañero («ofrécele 5 %», «ya pagó») el equipo usaba el
campo de notas del contacto: uno solo, sin autor ni hora. En el hilo no había
forma de anotar sin que le llegara al cliente.

## Cómo se corre

```bash
node --env-file=<env> scripts/e2e-notas-internas.mjs
```

La app tiene que estar viva con `WA_MOCK_ENABLED=true`. Con `E2E_EMAIL` y
`E2E_PASSWORD` se entra con la dueña de una base que ya tenga organización.
El guion da de alta a Laura como miembro.

## Camino verificado

1. **Escribir (AC1).** Con la conversación abierta en las dos sesiones, la
   dueña pasa a «Nota interna», escribe y da Enter.
   - La nota aparece en su hilo con «Nota interna», su nombre y la hora.
   - La caja queda vacía.
   - **Ningún mensaje** sale al wa-mock.
2. **No es un mensaje (AC2).** La conversación no cambia:
   - mismo último mensaje y misma hora en la lista;
   - sin no leídos nuevos;
   - la ventana igual;
   - la nota no está en `/messages`.
3. **En vivo (AC4).** Laura la ve sin recargar y no se le ofrece borrarla.
4. **Borrar (AC5).**
   - Laura intenta borrarla por API: 403.
   - Laura escribe la suya, que llega en vivo a la dueña firmada por «Laura
     Ventas». `puedeBorrar` sale distinto para cada quien.
   - La dueña (configura) borra la de Laura desde la interfaz y desaparece
     también en la sesión de Laura.
5. **Ventana cerrada (AC3).**
   - En una conversación de hace 30 h, las pestañas siguen y «Responder»
     ofrece plantillas.
   - La nota se guarda sin enviar nada.
6. **Validación (AC6).** Texto vacío: 422. Conversación que no es de la
   organización: 404 al escribir y al listar.
7. **Celular (AC7).** A 390 px, pestañas y nota sin desplazamiento
   horizontal.

## Lo que no cubre

- **Que nada del envío, el despacho, el bot o las métricas lea las notas**:
  lo vigila `tests/unit/notas-internas.test.ts`, que escanea esas carpetas.
