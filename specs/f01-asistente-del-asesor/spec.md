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

## Fases siguientes

- **Fase 2** — sugerir respuesta y seguimiento con la conversación, la etapa
  del lead y el conocimiento del negocio; marcadores `[precio]` en vez de
  inventar; con la ventana cerrada, sugerir plantilla.
- **Fase 3** — coach de técnicas de venta (SPIN, objeciones, cierre por
  alternativa, prueba social, urgencia honesta, venta consultiva).
