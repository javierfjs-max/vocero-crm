import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MediaValidationError, validateOutgoing } from "@/server/whatsapp/media";
import { MIME_NOTA_DE_VOZ, prepararAudioSaliente } from "@/server/whatsapp/nota-de-voz";

/** 044 — Lo que graba el compositor sale como lo acepta WhatsApp. */
const webm = readFileSync(path.join(import.meta.dirname, "../fixtures/nota-chrome.webm"));

describe("prepararAudioSaliente", () => {
  it("la grabación de Chrome (WebM) sale en Ogg/Opus y como nota de voz", () => {
    const { file, voice } = prepararAudioSaliente(
      { data: webm, mimeType: "audio/webm;codecs=opus", fileName: "nota-de-voz.webm" },
      true
    );
    expect(voice).toBe(true);
    expect(file.mimeType).toBe(MIME_NOTA_DE_VOZ);
    expect(file.fileName).toBe("nota-de-voz.ogg");
    expect(file.data.subarray(0, 4).toString("latin1")).toBe("OggS");
    // Y ya pasa la validación de la Cloud API como audio.
    expect(validateOutgoing(file.mimeType, file.data.byteLength)).toBe("audio");
  });

  it("un WebM subido con el clip también se convierte, pero no es nota de voz", () => {
    const { file, voice } = prepararAudioSaliente(
      { data: webm, mimeType: "audio/webm", fileName: "reunion.webm" },
      false
    );
    expect(voice).toBe(false);
    expect(file.fileName).toBe("reunion.ogg");
  });

  it("Firefox ya graba Ogg: pasa tal cual, con el MIME que pide Meta", () => {
    const ogg = Buffer.from("OggS…");
    const { file, voice } = prepararAudioSaliente({ data: ogg, mimeType: "audio/ogg" }, true);
    expect(voice).toBe(true);
    expect(file.mimeType).toBe(MIME_NOTA_DE_VOZ);
    expect(file.data).toBe(ogg);
  });

  it("Safari graba MP4/AAC: sale como audio normal, no como nota de voz", () => {
    const mp4 = Buffer.from("....ftypM4A ");
    const { file, voice } = prepararAudioSaliente({ data: mp4, mimeType: "audio/mp4" }, true);
    expect(voice).toBe(false);
    expect(file.mimeType).toBe("audio/mp4");
  });

  it("un WebM roto se rechaza con el motivo, no sale como documento", () => {
    expect(() =>
      prepararAudioSaliente({ data: Buffer.from("no es webm"), mimeType: "audio/webm" }, true)
    ).toThrow(MediaValidationError);
  });
});
