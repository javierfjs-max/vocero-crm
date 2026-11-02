# 051 — Borrador por conversación

**Feature Branch**: `feat/051-borrador-por-conversacion` (sobre la 050, #152: las dos tocan el compositor)

**Created**: 2026-10-23

**Status**: Especificada antes de escribir código. Implementada; gates y arnés E2E (19/19) en verde.

**Input**: quinta spec de la 2.2, elegida por Kevin el 2026-10-23
([046 research.md](../046-referencias-2.2/research.md)). Salió de lo que REA
encontró en Chatwoot (MIT): guarda el borrador de cada conversación en
`localStorage` (`draftMessages`). Vocero lo tiraba al cambiar de chat, porque
la 028 (D5) remonta el compositor para que un adjunto no viaje a otra
conversación.

**Carril**: ligero (Principio VI). Sin modelo de datos ni contrato: vive en
el navegador.

## Problema

Quien atiende tres chats a la vez empieza a escribir en uno, salta a otro
para contestar algo rápido y, al volver, lo que escribió ya no está. Con la
028 eso es a propósito para el adjunto, pero también se lleva el texto.

## Decisiones

**D1 — El texto se guarda por conversación, en el navegador.**

- Al escribir, el texto de la caja se guarda con la clave
  `vocero.borrador.responder.<id>`. La nota interna (050) se guarda igual con
  `vocero.borrador.nota.<id>`.
- Al volver a la conversación, la caja lo trae de vuelta y el cursor queda al
  final.
- El **adjunto no** se guarda: la decisión D5 de la 028 sigue en pie.

**D2 — Se borra cuando ya no hace falta.**

- **Al enviar o guardar la nota**, se borra. Si el envío falla, el texto
  vuelve a la caja y con él el borrador, como hoy.
- **Al vaciar la caja**, se borra.
- **A los 7 días**, se borra al leerlo: un borrador viejo confunde más de lo
  que ayuda.
- **Al cerrar sesión**, se borran todos. En una computadora compartida, lo que
  alguien escribió para un cliente no debe quedar para el siguiente.

**D3 — Solo en ese navegador.** No viaja entre dispositivos ni entre
personas: el borrador es de quien lo escribe y no se sube al servidor. Si el
navegador no deja usar `localStorage` (modo privado estricto), todo funciona
como antes, sin borradores.

**D4 — En la lista, «Borrador»** (como en WhatsApp). Si una conversación tiene
borrador, su vista previa en la lista dice «Borrador: …» en tono de acento.
Así se ve dónde quedó algo a medias.

## Criterios de aceptación

- **AC1.** Escribir «Te confirmo mañana» en A, ir a B y volver a A: el texto
  sigue en la caja.
- **AC2.** En la lista, A dice «Borrador: Te confirmo mañana» mientras no se
  envíe.
- **AC3.** Enviar desde A: la caja queda vacía, al volver no hay borrador y la
  lista ya no dice «Borrador».
- **AC4.** Vaciar la caja a mano también lo borra.
- **AC5.** Un borrador de más de 7 días no se restaura y se elimina.
- **AC6.** «Cerrar sesión» borra todos los borradores de ese navegador.
- **AC7.** La nota interna (050) conserva su propio borrador, aparte del de
  Responder.
- **AC8.** Un adjunto elegido en A no aparece al volver a A (028 D5 intacta).

## Qué NO se hace y por qué

- **Borradores en el servidor** (que viajen entre dispositivos): serían datos
  nuevos por usuario y por conversación, con su tabla y su limpieza. Lo que
  pide el problema es no perder el texto al cambiar de chat en el mismo
  equipo.
- **Guardar el adjunto**: ver D1.
- **Guardar la cita** (039): la respuesta citando se arma en un clic; no vale
  la complejidad de guardar un id de mensaje que puede ya no existir.

## Constitution Check

| Principio | Cómo se cumple |
|---|---|
| I · Seguridad | Nada sale del navegador. Se borra al cerrar sesión y a los 7 días (D2) |
| II · Soberanía | Sin dependencias ni terceros |
| III · Multi-tenancy | La clave lleva el id de la conversación, que es único; al cerrar sesión se borran todos |
| IV · Idempotencia | No aplica: no hay escritura en el servidor |
| V · Hecho | Unitarias (guardar, leer, caducar, limpiar) y arnés E2E con Playwright |
| VI · Specs | Este documento, antes del código; carril ligero |
| VIII · Foco | Atender varias conversaciones a la vez sin perder lo escrito |
| IX · En vivo | El arnés cambia de conversación de verdad y cierra sesión |
