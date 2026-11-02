# Guion E2E — Barra de la Bandeja: «Todas | No leídas» y «Filtrar» (052)

> Automatizado en `scripts/e2e-filtros-ventana.mjs` (22 checks). Spec:
> [052](../../specs/052-filtros-ventana/spec.md), con su enmienda del
> 2026-10-23 (un solo botón «Filtrar», sin «Sin responder»).

## Por qué

Pasada la ventana del canal solo se le puede escribir al cliente con una
plantilla de pago: la bandeja avisa a quién se le está por cerrar. La primera
versión puso cada filtro como un botón ovalado más; la enmienda los junta en
un solo menú y quita «Sin responder».

## Camino verificado

1. Entran tres conversaciones: una de ahora, una de hace 22 h 30 min y una de
   hace 30 h. El DTO ya no trae `esperandoRespuesta`.
2. **AC-E1.** La barra tiene solo las pestañas «Todas» y «No leídas» y un
   botón «Filtrar». «Sin responder» no aparece.
3. **AC3.** Sin filtro puesto, la fila de la de 22 h 30 min dice «Vence en 1 h
   2x min».
4. **AC-E3.**
   - En el menú, «Por vencer» deja solo la de 22 h 30 min.
   - El botón dice «Filtrar · 1».
   - Escape cierra el menú y abajo queda la etiqueta «Por vencer ✕».
5. **AC-E2.** La etapa vive en el menú. Con etapa y «Por vencer» el botón dice
   «Filtrar · 2» y aparece la etiqueta «Etapa: … ✕»; los filtros se combinan.
6. **AC-E3.** Combinado con la búsqueda de la cerrada, queda vacío. «No leídas»
   cuenta dentro de lo filtrado.
7. **AC-E4.** El ✕ de una etiqueta quita ese filtro; «Limpiar filtros» los
   quita todos y vuelve la lista entera.
8. **AC-E5.** A 390 px, barra y menú abierto sin desplazamiento horizontal.

«De anuncios» (018) se prueba en `scripts/e2e-anuncio-origen-ui.mjs`, que ahora
lo marca desde el mismo menú y lo quita con su etiqueta.
