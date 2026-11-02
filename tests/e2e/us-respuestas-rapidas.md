# Guion E2E — Respuestas rápidas con «/» (049)

> Automatizado en `scripts/e2e-respuestas-rapidas.mjs` (37 checks en una base
> limpia; 35 si la demo no se puede cargar). API, compositor real con Playwright en
> escritorio y a 390 px, y Ajustes. Spec:
> [049](../../specs/049-respuestas-rapidas/spec.md).

## Por qué

Quien atiende escribe treinta veces al día el horario, cómo se paga o si hay
envío. Las plantillas de Meta no sirven para eso: son para reabrir la ventana
y cuestan.

## Cómo se corre

```bash
node --env-file=<env> scripts/e2e-respuestas-rapidas.mjs
```

La app tiene que estar viva con `WA_MOCK_ENABLED=true`. `E2E_EMAIL` y
`E2E_PASSWORD` sirven para entrar con una cuenta que ya exista. La demo (AC7)
solo se prueba sobre una base sin datos: si responde 409, el guion se la
salta y lo dice.

## Camino verificado

1. **Ajustes por API (AC4).**
   - `/Horario` se guarda como `horario` y `Envío` como `envio`.
   - Un atajo repetido → 409 `duplicado`.
   - `¡¡!!` o un texto vacío → 422.
   - Editar → 200.
2. **El menú (AC1).**
   - `/` abre el menú con las tres respuestas.
   - `/hor` deja solo `horario`.
   - Escape cierra el menú sin tocar el texto.
3. **Elegir (AC2).**
   - `/env` + Enter cambia el atajo por «¡Hola María! …»: `{nombre}` sale con
     el primer nombre del contacto.
   - El menú se cierra y el mensaje **no se envía solo**.
   - ↓ mueve la fila resaltada y Tab elige.
4. **En medio del texto (AC3).**
   - «Gracias /pa» + un clic → «Gracias Aceptamos…».
   - `3/4` y `https://tienda.mx` no abren el menú.
   - Enter sin menú envía, como siempre.
5. **Celular (AC8).** A 390 px el menú cabe sin desplazamiento horizontal y
   se elige tocando.
6. **Un miembro sin permiso (AC4).**
   - Lista y usa las respuestas, con `puedeEditar: false`.
   - Crear, editar y borrar dan 403.
7. **Ajustes, la pantalla.**
   - Lista las tres.
   - Al crear, enseña cómo queda el atajo (`/direccion`).
   - Crea y borra con confirmación.
8. **Sin respuestas (AC6).** El menú dice «Aún no hay respuestas rápidas» y,
   a quien configura, «Crearlas en Ajustes».
9. **Demo (AC7).**
   - Cargarla deja `envio`, `hola`, `horario` y `pago`.
   - Cargarla otra vez no duplica nada.
10. Sin errores de JavaScript en la página.

## Lo que no cubre

- **Aislamiento entre organizaciones (AC5).** Con el registro cerrado no se
  crea una segunda organización desde el guion. Todas las consultas pasan por
  `scoped()` (`src/server/quick-replies.ts`) y el índice único es
  `(organization_id, atajo)`.
