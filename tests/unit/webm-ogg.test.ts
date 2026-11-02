import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  crcOgg,
  esWebm,
  extraerOpusDeWebm,
  muestrasDePaquete,
  webmAOgg,
  WebmOggError,
} from "@/lib/audio/webm-ogg";

/**
 * 044 — WebM/Opus → Ogg/Opus. La muestra la grabó Chromium con
 * `MediaRecorder` (2.5 s del tono del micrófono falso): Segment y Cluster con
 * tamaño desconocido, como cualquier grabación real de Chrome o Edge.
 */
const webm = new Uint8Array(
  readFileSync(path.join(import.meta.dirname, "../fixtures/nota-chrome.webm"))
);

type Pagina = { tipo: number; granulo: number; secuencia: number; paquetes: Uint8Array[] };

/** Lector de Ogg independiente del escritor: valida firma, CRC y segmentos. */
function leerOgg(ogg: Uint8Array): Pagina[] {
  const paginas: Pagina[] = [];
  const dv = new DataView(ogg.buffer, ogg.byteOffset, ogg.byteLength);
  let pos = 0;
  while (pos < ogg.length) {
    expect(new TextDecoder().decode(ogg.subarray(pos, pos + 4))).toBe("OggS");
    const nseg = ogg[pos + 26]!;
    const tabla = Array.from(ogg.subarray(pos + 27, pos + 27 + nseg));
    const largo = 27 + nseg + tabla.reduce((a, b) => a + b, 0);
    const copia = ogg.slice(pos, pos + largo);
    new DataView(copia.buffer).setUint32(22, 0, true);
    expect(crcOgg(copia)).toBe(dv.getUint32(pos + 22, true));
    const paquetes: Uint8Array[] = [];
    let cuerpo = pos + 27 + nseg;
    let inicio = cuerpo;
    for (const s of tabla) {
      cuerpo += s;
      if (s < 255) {
        paquetes.push(ogg.subarray(inicio, cuerpo));
        inicio = cuerpo;
      }
    }
    paginas.push({
      tipo: ogg[pos + 5]!,
      granulo: Number(dv.getBigInt64(pos + 6, true)),
      secuencia: dv.getUint32(pos + 18, true),
      paquetes,
    });
    pos += largo;
  }
  return paginas;
}

describe("webmAOgg", () => {
  it("la grabación de Chrome sale como Ogg/Opus mono, con cada página íntegra", () => {
    const ogg = webmAOgg(webm);
    const paginas = leerOgg(ogg);

    const head = paginas[0]!;
    expect(head.tipo).toBe(0x02); // inicio de flujo
    const opusHead = head.paquetes[0]!;
    expect(new TextDecoder().decode(opusHead.subarray(0, 8))).toBe("OpusHead");
    expect(opusHead[9]).toBe(1); // mono, como pide WhatsApp

    expect(new TextDecoder().decode(paginas[1]!.paquetes[0]!.subarray(0, 8))).toBe("OpusTags");
    expect(paginas.at(-1)!.tipo).toBe(0x04); // fin de flujo
    expect(paginas.map((p) => p.secuencia)).toEqual(paginas.map((_, i) => i));

    // Los mismos paquetes, en el mismo orden: no se recodifica nada.
    const { paquetes } = extraerOpusDeWebm(webm);
    const enOgg = paginas.slice(2).flatMap((p) => p.paquetes);
    expect(enOgg.length).toBe(paquetes.length);
    expect(Buffer.from(enOgg[10]!).equals(Buffer.from(paquetes[10]!))).toBe(true);

    // La duración sale de la posición de la última página (menos el pre-skip).
    const preskip = new DataView(opusHead.buffer, opusHead.byteOffset).getUint16(10, true);
    const segundos = (paginas.at(-1)!.granulo - preskip) / 48000;
    expect(segundos).toBeGreaterThan(2.2);
    expect(segundos).toBeLessThan(2.8);
  });

  it("una grabación cortada a media escritura se convierte con lo que hay", () => {
    const cortada = webm.subarray(0, Math.floor(webm.length * 0.8));
    const paginas = leerOgg(webmAOgg(cortada));
    expect(paginas.at(-1)!.tipo).toBe(0x04);
    expect(paginas.length).toBeGreaterThan(2);
  });

  it("lo que no es WebM con Opus se rechaza con un error propio", () => {
    expect(() => webmAOgg(new TextEncoder().encode("OggS no soy webm"))).toThrow(WebmOggError);
    expect(() => webmAOgg(new Uint8Array(0))).toThrow(WebmOggError);
  });

  it("esWebm mira la cabecera EBML", () => {
    expect(esWebm(webm)).toBe(true);
    expect(esWebm(webmAOgg(webm))).toBe(false);
  });
});

describe("muestrasDePaquete (TOC de Opus, a 48 kHz)", () => {
  it("una trama CELT de 20 ms son 960 muestras", () => {
    expect(muestrasDePaquete(new Uint8Array([31 << 3]))).toBe(960);
  });
  it("dos tramas SILK de 60 ms (código 1) son 5,760", () => {
    expect(muestrasDePaquete(new Uint8Array([(3 << 3) | 1]))).toBe(5760);
  });
  it("código 3 lee el número de tramas del segundo byte", () => {
    expect(muestrasDePaquete(new Uint8Array([(31 << 3) | 3, 3]))).toBe(2880);
  });
  it("CELT de 2.5 ms son 120 muestras", () => {
    expect(muestrasDePaquete(new Uint8Array([16 << 3]))).toBe(120);
  });
});
