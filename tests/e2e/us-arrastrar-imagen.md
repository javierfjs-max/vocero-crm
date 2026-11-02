# Arrastrar una imagen al chat (spec 043)

Automatizado: `node --env-file=.env scripts/e2e-arrastrar-imagen.mjs`, con la
app viva, `WA_MOCK_ENABLED=true` y `META_GRAPH_BASE_URL` apuntando a wa-mock.
El arnés manda los eventos de arrastre con un `DataTransfer` que lleva
archivos, como el del sistema al arrastrar desde el escritorio.

## Guion

1. Arrastrar un archivo sobre el chat. **Esperado:** «Suelta la imagen para
   adjuntarla». Pasar por una burbuja no lo quita; salir del área sí.
   Arrastrar texto no lo enseña.
2. Con texto escrito, soltar una imagen sobre el hilo. **Esperado:** queda
   como adjunto con vista previa, el texto pasa a ser el pie, no se envía nada
   y la página no cambia. Soltarla sobre el campo hace lo mismo.
3. Soltar un PDF, dos imágenes y una de más de 5 MB. **Esperado:** cada una
   avisa; el adjunto y el pie siguen.
4. Enviar con la subida retenida y, mientras, soltar otra imagen.
   **Esperado:** no reemplaza al adjunto en vuelo; al terminar, sale una sola
   vez al hilo y a Graph con su pie.
5. Soltar un archivo sobre la lista de conversaciones. **Esperado:** el
   navegador no abre el archivo y no se adjunta nada.
6. En una conversación con la ventana de 24 h cerrada. **Esperado:** sin
   indicador; soltar avisa que la ventana está cerrada y no adjunta.
7. Con el indicador puesto, cambiar de conversación. **Esperado:** el
   indicador desaparece.

## Fuera del guion

- La validación (formato, tamaño, una a la vez) es la de la 042 y tiene su
  unitaria en `tests/unit/forward-image.test.ts`.
- El arnés de la 042 (`scripts/e2e-imagenes.mjs`) también pasa sobre esta
  rama: el hilo ahora vive dentro del compositor.
