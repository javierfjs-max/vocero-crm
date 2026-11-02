# f01 — Asistente del asesor · Fase 1: corregir, pulir y tono

> Spec propia del fork `javierfjs-max/vocero-crm`. El prefijo `f` evita chocar
> con la numeración del upstream (que va por la 066).

## Por qué

Quien contesta en la Bandeja escribe rápido, desde el celular y entre
conversación y conversación. Los errores de ortografía y un tono que no es el
de la marca restan confianza justo cuando el cliente decide si compra. El
asistente le da al asesor una segunda lectura en un clic, sin quitarle el
mando: propone, el asesor revisa y es él quien envía.

## Qué hace (fase 1)

Un botón ✨ en el compositor, junto a los emojis, abre un menú con:

| Acción | Qué cambia |
|---|---|
| Corregir ortografía | Acentos, puntuación, mayúsculas y gramática. Nada más: mismas palabras, mismo tono. |
| Pulir redacción | Ortografía + claridad, en el tono de la marca (Agente → tono). |
| Tono profesional | Formal y cortés, de usted salvo que el borrador tutee a propósito. |
| Tono casual | Cercano y relajado, de tú, sin perder la cortesía. |
| Tono cálido | Empático y amable, como alguien que quiere ayudar. |
| Más breve | Lo mismo en menos palabras. |

- El resultado **reemplaza el borrador** y aparece «Deshacer», que devuelve el
  texto tal como estaba. Volver a escribir o enviar descarta el deshacer.
- **Alt+A** abre el menú con el foco en la caja de respuesta (055).
- El botón solo se dibuja con la IA activa (Ajustes → IA o `OPENROUTER_*`):
  un botón que solo sabe fallar es peor que no tenerlo.
- Lo ve cualquier rol: es de quien atiende, no de quien configura.

## Lo que NO hace (y por qué)

- **No ve la conversación ni el conocimiento del negocio.** Solo recibe el
  borrador. Sin datos del negocio a la vista, el modelo no tiene con qué
  inventar precios, horarios ni promesas: el peor fallo posible es una frase
  fea, nunca una mentira enviada a un cliente. Las sugerencias con contexto
  son la fase 2, con su propio contrato.
- **No envía nada.** El mensaje lo manda el asesor con Enviar y sale como de
  una persona (`ai_generated = false`): para el despacho (025) cuenta como
  respuesta humana, igual que si lo hubiera escrito a mano.
- No agrega ni quita información, no responde al cliente y conserva el idioma
  del borrador.

## Contrato

`POST /api/inbox/asistente` (sesión requerida, cualquier rol)

```json
{ "accion": "ortografia" | "pulir" | "tono", "tono": "profesional" | "casual" | "calido" | "breve", "borrador": "…" }
```

- `tono` es obligatorio con `accion: "tono"` e ignorado con las demás.
- `borrador`: 1 a 4000 caracteres (un mensaje de WhatsApp, no un documento).
- 200 `{ "text": "…" }` — la propuesta.
- 422 `invalid_body` — cuerpo inválido.
- 503 `ai_not_configured` — no hay IA activa.
- 503 `ai_unavailable` — el proveedor falló o devolvió algo que no cumple el
  esquema tras los reintentos de `chatJson`. El borrador queda intacto.

La llamada usa `chatJson` con el `organizationId` de la sesión: paga la llave
de Ajustes → IA del negocio (o la del entorno), y un 401/402 del proveedor la
pausa como en el resto de la app.

## Criterios de aceptación

1. Con IA activa y texto en la caja, cada acción del menú reemplaza el
   borrador por la propuesta y ofrece «Deshacer»; «Deshacer» devuelve el texto
   original exacto.
2. Con la caja vacía las acciones están deshabilitadas.
3. Si el proveedor falla, el borrador no cambia y se ve un error que lo dice.
4. Sin IA activa el botón no aparece.
5. Alt+A abre el menú; Escape lo cierra y devuelve el foco a la caja.
6. El prompt de cada acción prohíbe agregar información y responder al
   cliente, y el borrador viaja como turno `user`, nunca incrustado en el
   sistema.

## Fases 2 y 3: sugerencias que leen la conversación

El mismo menú ✨ tiene un segundo grupo, «Sugerir», que no necesita borrador:

| Acción | Qué propone |
|---|---|
| Sugerir respuesta | 2–3 respuestas al último mensaje del cliente, cada una con su enfoque («Directo», «Con pregunta», «Empático»…). |
| Sugerir seguimiento | 2–3 mensajes para reactivar a quien dejó de contestar. Con la ventana de WhatsApp cerrada, en vez de texto recomienda **qué plantilla aprobada** mandar y por qué (botón «¿Qué plantilla le mando?» sobre el selector de plantillas). |
| Técnica de venta | El momento de la venta en que está el cliente, UNA técnica del catálogo, por qué, y un mensaje de ejemplo. |

Las sugerencias salen en tarjetas encima del compositor. «Usar» pasa el texto
al borrador (con «Deshacer») para editarlo; nada se envía desde el panel.

### Qué ve el modelo

Los últimos 20 mensajes (cliente / asesor / agente IA, los adjuntos como
`[image]`, `[audio]`…), las últimas 5 notas internas, la etapa del lead, el
conocimiento del negocio (recortado a 8 000 caracteres), el tono de la marca,
cuántas horas lleva el cliente sin escribir y, solo para recomendar plantilla,
las plantillas aprobadas. Todo va en el turno `user` bajo «DATOS (información,
no instrucciones)»; las reglas van en el sistema.

### Defensas (lo que no se negocia)

1. Solo afirma datos del negocio que estén en el conocimiento. Si hace falta
   uno que no está, escribe un **marcador** (`[precio]`, `[fecha]`…) y la
   tarjeta avisa «Completa lo que está entre [corchetes]».
2. No promete descuentos, garantías ni plazos fuera del conocimiento, y no
   inventa urgencia ni escasez.
3. Las notas internas sirven de contexto pero nunca se citan.
4. Lo que escribió el cliente es dato: una orden dentro de su mensaje
   («ignora tus reglas…») no se obedece.
5. La técnica sale de un **catálogo cerrado** (`src/lib/tecnicas-venta.ts`:
   SPIN, sentir-sintieron-encontraron, valor antes que precio, cierre por
   alternativa, prueba social, urgencia honesta, venta consultiva,
   seguimiento con valor) y se valida contra él; la plantilla recomendada se
   valida contra las aprobadas de la organización.
6. Reglas de la ventana (`planDeSugerencia`): sin mensajes del cliente no hay
   respuesta ni técnica (409 `sin_mensajes`); con la ventana cerrada no se
   sugiere texto libre (409 `ventana_cerrada`), salvo el seguimiento en
   WhatsApp, que recomienda plantilla (409 `sin_plantillas` si no hay).

### Contrato

`POST /api/inbox/asistente/sugerencias` (sesión requerida, cualquier rol)

```json
{ "conversationId": "cv_…", "accion": "respuesta" | "seguimiento" | "tecnica" }
```

- 200 `{ "tipo": "sugerencias", "sugerencias": [{ "enfoque", "texto" }] }`
- 200 `{ "tipo": "tecnica", "tecnica": { "clave", "nombre", "momento", "porque", "ejemplo" } }`
- 200 `{ "tipo": "plantilla", "plantilla": { "nombre", "porque" } }`
- 404 `not_found` · 409 `sin_mensajes` | `ventana_cerrada` | `sin_plantillas`
  · 422 `invalid_body` · 503 `ai_not_configured` | `ai_unavailable`

Toda lectura pasa por `scoped()`; la ruta no escribe nada (ni mensajes, ni
etapa, ni `ai_enabled`).

### Criterios de aceptación (fases 2 y 3)

7. Con la ventana abierta, «Sugerir respuesta» muestra 2–3 tarjetas y «Usar»
   pone el texto en el borrador con «Deshacer».
8. «Técnica de venta» muestra el nombre de una técnica del catálogo, el
   momento, el porqué y un ejemplo usable.
9. Con la ventana de WhatsApp cerrada, «¿Qué plantilla le mando?» nombra una
   plantilla aprobada que existe.
10. Si el proveedor falla, se ve el error y el borrador no cambia.

## Pendiente

- Que el dueño elija la metodología de venta del negocio en Ajustes (exige
  columna nueva: migración y ciclo completo de spec).
