/**
 * Self-test E2E — un adjunto cuyo archivo se perdió del volumen se recupera.
 * Guion: tests/e2e/us-imagenes.md («El archivo se perdió del volumen»).
 *
 * Caso real (2026-10-23, crm-dev): la app corría sin volumen en `/data`, el
 * redespliegue de la 2.2.0-rc.1 se llevó los archivos y todos los audios e
 * imágenes respondían 410, aunque Meta todavía los tenía. Ahora, si la base
 * dice «disponible» pero el archivo no está, se vuelve a bajar de Meta.
 *
 * Requiere la app viva con WA_MOCK_ENABLED=true, META_GRAPH_BASE_URL → wa-mock
 * y el MISMO `MEDIA_DIR` en el entorno del guion (borra el archivo ahí).
 *
 * Uso: node --env-file=<env> scripts/e2e-adjunto-perdido.mjs
 */
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";
const MEDIA_DIR = process.env.MEDIA_DIR ?? "";
const EMAIL = process.env.E2E_EMAIL ?? "e2e-adjunto@vocero.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "password-e2e-adjunto";
const RUN = Date.now().toString(36);
const PN = `PN-ADJ-${RUN}`;

let failures = 0;
let checks = 0;
function ok(name, cond, extra = "") {
  checks++;
  if (cond) console.log(`  OK  ${name}`);
  else {
    failures++;
    console.log(`  FALLA  ${name}${extra ? ` — ${extra}` : ""}`);
  }
}
let cookie = "";
async function api(p, init = {}) {
  const res = await fetch(`${BASE}${p}`, {
    ...init,
    headers: { "content-type": "application/json", origin: BASE, cookie, ...(init.headers ?? {}) },
  });
  const set = res.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  return res;
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function hasta(fn, ms = 60000) {
  const fin = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v || Date.now() > fin) return v;
    await espera(300);
  }
}

async function adjuntoDe(nombre) {
  const convs = (await (await api("/api/conversations")).json()).conversations ?? [];
  const conv = convs.find((c) => c.contact.name === nombre);
  if (!conv) return null;
  const ms = (await (await api(`/api/conversations/${conv.id}/messages`)).json()).messages ?? [];
  return ms.find((m) => m.media)?.media ?? null;
}

async function entraImagen(nombre, mediaId) {
  await api("/api/dev/wa-mock/inbound", {
    method: "POST",
    body: JSON.stringify({
      phoneNumberId: PN,
      from: `52155${String(Date.now()).slice(-8)}`,
      name: nombre,
      type: "image",
      mediaId,
      mimeType: "image/png",
      waMessageId: `wamid.adj.${RUN}.${mediaId}`,
    }),
  });
  return hasta(async () => {
    const m = await adjuntoDe(nombre);
    return m?.fetchStatus === "available" ? m : null;
  });
}

async function main() {
  if (!MEDIA_DIR) {
    console.error("Falta MEDIA_DIR en el entorno (el mismo de la app).");
    process.exit(1);
  }
  console.log("== Preparación ==");
  let r = await api("/api/auth/sign-up/email", { method: "POST", body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: "Dueña" }) });
  if (!r.ok) r = await api("/api/auth/sign-in/email", { method: "POST", body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
  ok("login", r.ok);
  r = await api("/api/settings/whatsapp", { method: "PUT", body: JSON.stringify({ wabaId: "WABA-ADJ", phoneNumberId: PN, token: "tok-adj" }) });
  ok("WhatsApp conectado (wa-mock)", r.ok);
  const org = (await (await api("/api/auth/get-session")).json())?.session?.activeOrganizationId;

  console.log("\n== Meta todavía lo tiene: se recupera ==");
  const nombre = `Cliente adjunto ${RUN}`;
  const media = await entraImagen(nombre, `mediaimagen${RUN}`);
  ok("la imagen entra y se descarga", Boolean(media), JSON.stringify(media));
  const antes = await api(`/api/media/${media.assetId}`);
  const bytesAntes = Buffer.from(await antes.arrayBuffer());
  ok("se sirve (200)", antes.status === 200, String(antes.status));

  const archivo = path.join(MEDIA_DIR, org ?? "", media.assetId);
  ok("el archivo está en el volumen", existsSync(archivo), archivo);
  rmSync(archivo, { force: true });
  ok("…y se borra, como un redespliegue sin volumen", !existsSync(archivo));

  const despues = await api(`/api/media/${media.assetId}`);
  const bytesDespues = Buffer.from(await despues.arrayBuffer());
  ok("se vuelve a servir (200) en vez de 410", despues.status === 200, `${despues.status} ${bytesDespues.toString("utf8").slice(0, 120)}`);
  ok("con el mismo contenido", bytesDespues.equals(bytesAntes));
  ok("y queda otra vez en el volumen", existsSync(archivo));

  console.log("\n== Meta ya no lo tiene: 410 claro, sin colgarse ==");
  const nombre2 = `Cliente caducado ${RUN}`;
  const media2 = await entraImagen(nombre2, `mediaimagen2${RUN}`);
  ok("la segunda imagen entra", Boolean(media2));
  const archivo2 = path.join(MEDIA_DIR, org ?? "", media2.assetId);
  rmSync(archivo2, { force: true });
  // Meta lo olvidó: el wa-mock solo conoce ids que empiezan con «media», así
  // que con otro id contesta como Meta con un medio caducado.
  const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await sql`update media_asset set wa_media_id = ${`caducado-${RUN}`} where id = ${media2.assetId}`;
    const t0 = Date.now();
    const res2 = await api(`/api/media/${media2.assetId}`);
    const cuerpo2 = await res2.json().catch(() => null);
    ok(
      "410 con explicación, no 500",
      res2.status === 410 && /volumen ni en WhatsApp/.test(cuerpo2?.error?.message ?? ""),
      `${res2.status} ${JSON.stringify(cuerpo2)}`
    );
    ok("en menos de 10 s", Date.now() - t0 < 10000, `${Date.now() - t0} ms`);
    const [fila] = await sql`select fetch_status from media_asset where id = ${media2.assetId}`;
    ok(
      "el adjunto queda como no disponible (la bandeja dice «contenido no disponible»)",
      fila?.fetch_status === "failed",
      JSON.stringify(fila)
    );
  } finally {
    await sql.end();
  }

  console.log(`\n${checks - failures}/${checks} checks en verde`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
