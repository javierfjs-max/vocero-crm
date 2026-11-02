# Selector de emojis (spec 041)

Automatizado: `node --env-file=.env scripts/e2e-selector-emojis.mjs`, con la
app viva, `WA_MOCK_ENABLED=true` y `META_GRAPH_BASE_URL` apuntando a wa-mock.

## Guion

1. En una conversación con la ventana abierta, enfocar «Emojis» y Enter.
   **Esperado:** se abre el panel y el foco va a la búsqueda.
2. Elegir «Sonrisa». **Esperado:** 😀 en el campo; el panel sigue abierto.
   Escape lo cierra y el foco vuelve al botón.
3. Escribir «Hola mundo, gracias», seleccionar «mundo», buscar «corazon en
   llamas» y elegirlo. **Esperado:** «Hola ❤️‍🔥, gracias», con el cursor
   detrás del emoji. Elegir otro lo pone ahí.
4. Categoría «Celebración» y elegir dos veces el confeti. **Esperado:** dos
   confetis seguidos; las caras no se ven en esa categoría.
5. Buscar algo sin coincidencias. **Esperado:** «No hay emojis que
   coincidan.» Un clic fuera cierra; al reabrir, la búsqueda está vacía.
6. **Esperado en todo lo anterior:** nada salió a Graph.
7. Enviar un texto con emojis compuestos. **Esperado:** llega intacto a Graph
   y al hilo; el campo queda vacío.
8. Elegir una imagen, escribir un pie y añadir un emoji. **Esperado:** el
   emoji va al pie y el adjunto sigue elegido.
9. Abrir una conversación con la ventana de 24 h cerrada. **Esperado:** no
   hay botón de emojis.
10. En 390 px de ancho. **Esperado:** el panel cabe, no tapa el campo y no hay
    desplazamiento horizontal.

## Fuera del guion

- La búsqueda y la inserción con selecciones raras están en
  `tests/unit/emojis.test.ts`.
- Durante el envío de un adjunto el botón se deshabilita (D3); el arnés no lo
  congela a la mitad.
