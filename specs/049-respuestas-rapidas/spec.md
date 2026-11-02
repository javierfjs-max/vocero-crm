# 049 — Respuestas rápidas con «/»

**Feature Branch**: `feat/049-respuestas-rapidas`

**Created**: 2026-10-23

**Status**: Especificada antes de escribir código. Implementada; gates, arnés E2E (37/37 en base limpia), self-test general (280/280) y capturas en claro y oscuro en verde.

**Input**: tercera spec de la 2.2, elegida por Kevin el 2026-10-23
([046 research.md](../046-referencias-2.2/research.md)). Referencias:

- **Chatwoot (MIT, observado en la Fase 1, captura `cw-06`)**: al teclear `/`
  se abre un menú con buscador; a la izquierda van los atajos y a la derecha
  la vista previa del texto.
- **DeskcommCRM (MIT, código leído)**: `message_templates` personales o
  compartidas, que se insertan con `/`.
- **wacrm (MIT)**: respuestas compartidas por la cuenta.

No se copia código de ninguno: el menú se escribe sobre el compositor de
Vocero, con sus tokens.

**Carril**: ciclo completo (Principio VI): tabla nueva. No toca contratos
publicados (`/api/bot/*`, despacho, webhook, SSE).

## Problema

Quien atiende un negocio escribe lo mismo treinta veces al día: el horario,
cómo se paga, si hay envío, la dirección. Hoy lo teclea cada vez o lo pega de
una nota en el teléfono. Las plantillas de Meta (`/settings/templates`) no
sirven para esto: son para reabrir la ventana, pasan por aprobación y cuestan.

## Decisiones

**D1 — Una respuesta rápida es un atajo y un texto, de la organización.**

- Tabla `quick_reply`: `atajo` (único por organización) y `texto`.
- Son compartidas: todo el equipo usa las mismas, como en wacrm. Las
  personales de DeskcommCRM no entran: en un negocio de 1 a 5 personas,
  tener dos listas confunde más de lo que ayuda.

**D2 — Se escriben con `/` en el compositor.** Al teclear `/` al inicio de la
caja o después de un espacio, aparece encima un menú con las respuestas que
coinciden con lo que sigue (`/hor` → «horario»).

- La coincidencia ignora acentos y mayúsculas. Primero van las que empiezan
  por el atajo; después, las que lo contienen en el atajo o en el texto.
- Con el teclado: ↑ y ↓ para moverse, Enter o Tab para elegir, Escape para
  cerrar.
- En el celular, se toca la respuesta.

Al elegir, el `/atajo` se **reemplaza** por el texto y el cursor queda al
final. **No se envía solo**: la persona revisa y manda.

**D3 — Una variable: `{nombre}`.** Se cambia por el primer nombre del
contacto. Si el contacto no tiene nombre (solo un teléfono o un BSUID), se
quita y no queda «Hola , …». Es lo que la bandeja ya hace con `{{1}}` en las
plantillas. Más variables quedan para cuando alguien las pida.

**D4 — Se administran en Ajustes → Respuestas rápidas.**

- Hay una lista, se crea, se edita y se borra.
- Solo quien configura (dueño o administrador), como el resto de Ajustes.
- Cualquiera del equipo las **usa**.
- El atajo se guarda en minúsculas, sin espacios ni `/`, con 1 a 32 caracteres
  de letras, números, `-` y `_`.
- El texto tiene de 1 a 4 096 caracteres, el tope de WhatsApp.
- Un atajo repetido → 409 con un mensaje claro.
- Tope de 200 por organización.

**D5 — Si no hay ninguna, el menú lo dice.** «Aún no hay respuestas rápidas».
Quien configura ve además un enlace a Ajustes. Así se descubre la función
desde donde se usa.

**D6 — La demo trae cuatro**: `hola`, `horario`, `envio` y `pago`, con
`{nombre}` en la de saludo. La semilla es idempotente.

**D7 — Solo donde hay caja de texto.** Con la ventana cerrada el compositor
ya no ofrece texto libre, así que tampoco hay `/`. En Instagram, Messenger y
TikTok funcionan igual: es texto.

## Criterios de aceptación

- **AC1 — Menú.** En una conversación con la ventana abierta, escribir `/`
  abre el menú con todas las respuestas, y `/hor` lo filtra a «horario».
  Escape lo cierra sin tocar el texto.
- **AC2 — Elegir.** Con ↓ y Enter, o tocando, el `/hor` se cambia por el
  texto. `{nombre}` sale con el primer nombre del contacto y el mensaje no se
  envía hasta que la persona lo manda.
- **AC3 — En medio del texto.** «Gracias /pa» → «Gracias » + el texto de
  «pago». Un `/` pegado a una palabra (`3/4`, `https://…`) no abre nada.
- **AC4 — Ajustes.**
  - Crear, editar y borrar funcionan.
  - El atajo se normaliza.
  - Un repetido da 409, y uno inválido o un texto vacío, 422.
  - Un miembro sin permiso de configurar recibe 403 al escribir, pero sí puede
    listar y usar.
- **AC5 — Organización.** Lo de una organización nunca aparece en otra.
- **AC6 — Vacío.** Sin respuestas, el menú dice «Aún no hay respuestas
  rápidas».
- **AC7 — Demo.** Cargar la demo deja las cuatro respuestas; cargarla otra
  vez no las duplica.
- **AC8 — Celular.** A 390 px el menú cabe sin desplazamiento horizontal y se
  elige tocando.

## Qué NO se hace y por qué

- **Respuestas personales**: ver D1.
- **Adjuntos o botones** en la respuesta (sí los tienen DeskcommCRM y wacrm):
  el compositor ya adjunta aparte, y los botones son mensajes interactivos de
  Meta, otro alcance.
- **Guardar como respuesta rápida desde el compositor** (wacrm): pequeño, pero
  suma botones a una caja que ya va llena. Si se pide, va en otra spec.
- **Que el cerebro las use**: no se exponen en `/api/bot/*`. El agente tiene
  su conocimiento (Agente → Conocimiento).

## Constitution Check

| Principio | Cómo se cumple |
|---|---|
| I · Seguridad | Sin secretos. Solo quien configura escribe |
| II · Soberanía | Sin dependencias ni terceros |
| III · Multi-tenancy | `organization_id` NOT NULL, índice único `(organization_id, atajo)` y todas las consultas con `scoped()` |
| IV · Idempotencia | La semilla no duplica (`ON CONFLICT DO NOTHING`); el atajo es único |
| V · Hecho | Unitarias de la parte pura (token, filtro, reemplazo, `{nombre}`), arnés E2E con Playwright y los cuatro gates |
| VI · Specs | Ciclo completo: esta spec, `plan.md` y `tasks.md` antes del código |
| VII · Trazabilidad | D1 a D7; bitácora al cerrar |
| VIII · Foco | Atender conversaciones de WhatsApp más rápido |
| IX · En vivo | El arnés conduce el compositor real en escritorio y a 390 px |
