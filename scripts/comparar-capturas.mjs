/**
 * Compara dos capturas píxel a píxel: el antes y el después de una spec.
 *
 * Da las mismas métricas que `compare_web_screenshots` de REA (proporción de
 * píxeles cambiados y delta medio por canal) más el rango de filas que cambió,
 * sin servicios externos. Usa el `sharp` que ya trae Next: no agrega
 * dependencias.
 *
 *   node scripts/comparar-capturas.mjs antes.png despues.png [umbral]
 *
 * `umbral` (0–255, por defecto 8) es cuánto tiene que moverse un canal para
 * contar el píxel como cambiado: con 0, el suavizado de las fuentes ya cuenta.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");

const [antes, despues, umbralArg = "8"] = process.argv.slice(2);
if (!antes || !despues) {
  console.error("Uso: node scripts/comparar-capturas.mjs antes.png despues.png [umbral]");
  process.exit(1);
}
const umbral = Number(umbralArg);
const leer = (f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const huella = (f) => createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 12);

const [A, B] = await Promise.all([leer(antes), leer(despues)]);
if (A.info.width !== B.info.width || A.info.height !== B.info.height) {
  console.log(JSON.stringify({ comparable: false, antes: A.info, despues: B.info }));
  process.exit(0);
}
let cambiados = 0;
const delta = [0, 0, 0];
const filas = new Set();
for (let i = 0; i < A.data.length; i += 4) {
  let cambia = false;
  for (let c = 0; c < 3; c++) {
    const d = Math.abs(A.data[i + c] - B.data[i + c]);
    delta[c] += d;
    if (d > umbral) cambia = true;
  }
  if (cambia) {
    cambiados++;
    filas.add(Math.floor(i / 4 / A.info.width));
  }
}
const total = A.data.length / 4;
const ys = [...filas].sort((x, y) => x - y);
console.log(
  JSON.stringify({
    antes: huella(antes),
    despues: huella(despues),
    tamano: `${A.info.width}x${A.info.height}`,
    proporcionCambiada: +(cambiados / total).toFixed(4),
    deltaMedio: delta.map((d) => +(d / total).toFixed(2)),
    filasCambiadas: ys.length ? `${ys[0]}–${ys.at(-1)}` : "ninguna",
  })
);
