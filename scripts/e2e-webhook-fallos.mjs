/**
 * Self-test E2E — 047: webhook a prueba de fallos.
 * Guion: tests/e2e/us-webhook-fallos.md.
 *
 * Un mensaje que falla al procesarse ya no se pierde: el evento se guarda
 * antes del 200, se reintenta solo y, si se agota, Ajustes → WhatsApp lo
 * enseña con un botón para reintentarlo.
 *
 * Requiere la app viva con:
 *   WA_MOCK_ENABLED=true, WEBHOOK_RETRY_FAST=1 (esperas de 300 ms en vez de
 *   horas), META_GRAPH_BASE_URL → wa-mock, META_APP_SECRET (se firma igual que
 *   Meta), CHANNELS=whatsapp,instagram,messenger,tiktok y
 *   ZERNIO_BASE_URL → zernio-mock.
 *
 * Uso: node --env-file=<env> scripts/e2e-webhook-fallos.mjs
 * Sale con 1 si algún check falla. Las capturas van a .tmp/.
 */
import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";
import postgres from "postgres";
import { chromium } from "playwright";

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";
const VT = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "";
const APP_SECRET = process.env.META_APP_SECRET ?? "";
const RUN = Date.now().toString(36);
const PN = `PN-047-${RUN}`;
const SECRET_ZERNIO = "secreto-zernio-047";
const LLAVE_ZERNIO = "sk_llave-zernio-047";
const CUENTA_IG = `ig-047-${RUN}`;

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
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function hasta(fn, ms = 15000, paso = 250) {
  const fin = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > fin) return v;
    await espera(paso);
  }
}

function cliente() {
  let cookie = "";
  return async function api(path, init = {}) {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "content-type": "application/json", origin: BASE, cookie, ...(init.headers ?? {}) },
    });
    const set = res.headers.getSetCookie?.() ?? [];
    if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { res, json, cookie: () => cookie };
  };
}
const api = cliente();

/** Un webhook de WhatsApp con la forma de Meta, firmado como Meta. */
function cuerpoWa({ from, name, text, wamid }) {
  return JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA-047",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "5215500000000", phone_number_id: PN },
              contacts: [{ profile: { name }, wa_id: from }],
              messages: [
                { from, id: wamid, timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: text } },
              ],
            },
          },
        ],
      },
    ],
  });
}
async function postWa(cuerpo) {
  const firma = APP_SECRET ? `sha256=${createHmac("sha256", APP_SECRET).update(cuerpo).digest("hex")}` : undefined;
  const res = await fetch(`${BASE}/api/webhooks/wa/${VT}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(firma ? { "x-hub-signature-256": firma } : {}) },
    body: cuerpo,
  });
  return res.status;
}
let n = 0;
function entrante(text) {
  n++;
  const from = `52155${RUN.slice(-4).replace(/\D/g, "7").padEnd(4, "7")}${String(1000 + n)}`;
  return { from, name: `Cliente047 ${RUN}-${n}`, text, wamid: `wamid.047.${RUN}.${n}` };
}

async function conversacionDe(nombre) {
  const r = await api("/api/conversations");
  return r.json?.conversations?.find((c) => c.contact.name === nombre) ?? null;
}
async function mensajesCon(nombre, texto) {
  const conv = await conversacionDe(nombre);
  if (!conv) return [];
  const r = await api(`/api/conversations/${conv.id}/messages`);
  return (r.json?.messages ?? []).filter((m) => m.text === texto);
}
const entregas = async () => (await api("/api/settings/webhook/eventos")).json;
const fallos = (veces) => api("/api/dev/webhook-fallo", { method: "POST", body: JSON.stringify({ veces }) });

async function main() {
  if (!VT) {
    console.error("Falta META_WEBHOOK_VERIFY_TOKEN en el entorno.");
    process.exit(1);
  }
  mkdirSync(".tmp", { recursive: true });

  console.log("== Preparación ==");
  const email = "e2e-047@vocero.test";
  const password = "password-e2e-047";
  let su = await api("/api/auth/sign-up/email", { method: "POST", body: JSON.stringify({ email, password, name: "Dueña 047" }) });
  if (!su.res.ok) su = await api("/api/auth/sign-in/email", { method: "POST", body: JSON.stringify({ email, password }) });
  ok("registro o login de la dueña", su.res.ok, JSON.stringify(su.json));
  const wa = await api("/api/settings/whatsapp", {
    method: "PUT",
    body: JSON.stringify({ wabaId: "WABA-047", phoneNumberId: PN, token: "tok-047" }),
  });
  ok("WhatsApp conectado (wa-mock)", wa.res.ok, JSON.stringify(wa.json));
  await fallos(0);

  console.log("\n== AC1 · camino feliz ==");
  const m1 = entrante("hola, ¿tienen taladros?");
  ok("la ruta responde 200", (await postWa(cuerpoWa(m1))) === 200);
  ok("el mensaje entra a la bandeja", (await hasta(async () => (await mensajesCon(m1.name, m1.text)).length === 1)) === true);
  const e1 = await hasta(async () => {
    const e = await entregas();
    return e && e.pendientes === 0 ? e : null;
  });
  ok("entregas al día: nada pendiente ni agotado", e1?.pendientes === 0 && e1?.agotados === 0, JSON.stringify(e1));

  console.log("\n== AC2 · falla una vez y entra en el reintento ==");
  await fallos(1);
  const m2 = entrante("¿hacen envíos?");
  ok("la ruta responde 200 aunque el procesamiento falle", (await postWa(cuerpoWa(m2))) === 200);
  ok(
    "el fallo inyectado se consumió",
    (await hasta(async () => (await api("/api/dev/webhook-fallo")).json?.veces === 0, 5000)) === true
  );
  ok(
    "el mensaje entra en el reintento, una sola vez",
    (await hasta(async () => (await mensajesCon(m2.name, m2.text)).length === 1)) === true,
    JSON.stringify(await mensajesCon(m2.name, m2.text))
  );

  console.log("\n== AC4 · la misma entrega dos veces ==");
  const m4 = entrante("mensaje repetido por Meta");
  const c4 = cuerpoWa(m4);
  const s4a = await postWa(c4);
  const s4b = await postWa(c4);
  ok("las dos entregas responden 200", s4a === 200 && s4b === 200, `${s4a} ${s4b}`);
  await hasta(async () => (await mensajesCon(m4.name, m4.text)).length >= 1);
  await espera(1500);
  ok("deja un solo mensaje", (await mensajesCon(m4.name, m4.text)).length === 1);

  console.log("\n== AC8 · número que nadie conectó ==");
  const antes = await entregas();
  const desconocido = cuerpoWa(entrante("de un número ajeno")).replaceAll(PN, `PN-AJENO-${RUN}`);
  ok("la ruta responde 200", (await postWa(desconocido)) === 200);
  await espera(1000);
  const despues = await entregas();
  ok("no se guarda ni queda pendiente", despues?.pendientes === antes?.pendientes && despues?.agotados === antes?.agotados, JSON.stringify(despues));

  console.log("\n== AC5 · seis fallos: agotado, visible y reintentable ==");
  await fallos(6);
  const m5 = entrante("cotización de 40 bultos de cemento");
  ok("la ruta responde 200", (await postWa(cuerpoWa(m5))) === 200);
  const e5 = await hasta(async () => {
    const e = await entregas();
    return e?.agotados >= 1 ? e : null;
  }, 20000);
  ok("queda agotado tras seis intentos", e5?.agotados === 1, JSON.stringify(e5));
  ok("con el último error, sin datos del cliente", /fallo de prueba/.test(e5?.ultimoError ?? "") && !(e5?.ultimoError ?? "").includes("cemento"), e5?.ultimoError);
  ok("el mensaje NO está en la bandeja", (await mensajesCon(m5.name, m5.text)).length === 0);
  const h = (await api("/api/health")).json;
  ok("/api/health cuenta el agotado sin bajar ok", h?.ok === true && h?.webhooks?.agotados >= 1, JSON.stringify(h?.webhooks));

  // La interfaz, como la usa la dueña.
  const browser = await chromium.launch();
  for (const tema of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: tema });
    const cookie = (await api("/api/auth/get-session")).cookie();
    await ctx.addCookies(
      cookie.split("; ").filter(Boolean).map((c) => {
        const i = c.indexOf("=");
        return { name: c.slice(0, i), value: c.slice(i + 1), url: BASE };
      })
    );
    // El tema es una preferencia del dispositivo (cookie), no del sistema.
    await ctx.addCookies([{ name: "vocero-theme", value: tema, url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/settings/whatsapp`, { waitUntil: "domcontentloaded" });
    const tarjeta = page.getByTestId("entregas-webhook");
    await tarjeta.waitFor({ timeout: 60000 });
    const texto = await tarjeta.innerText();
    ok(`[${tema}] la tarjeta avisa que una entrega no entró`, /1 entrega no pudo entrar/.test(texto), texto);
    ok(`[${tema}] enseña el error`, /fallo de prueba/.test(texto));
    await tarjeta.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `.tmp/e2e-047-agotado-${tema}.png`, fullPage: true });
    if (tema === "dark") {
      await tarjeta.getByRole("button", { name: /Reintentar/ }).click();
      await page.getByText(/Entregas al día/).waitFor({ timeout: 20000 }).catch(() => {});
      const tras = await tarjeta.innerText();
      ok("tras Reintentar dice «Entregas al día»", /Entregas al día/.test(tras), tras);
      await page.screenshot({ path: `.tmp/e2e-047-al-dia-${tema}.png`, fullPage: true });
    }
    await ctx.close();
  }
  ok(
    "y el mensaje entró a la bandeja, una vez",
    (await hasta(async () => (await mensajesCon(m5.name, m5.text)).length === 1)) === true
  );
  const hFin = (await api("/api/health")).json;
  ok("/api/health vuelve a cero agotados", hFin?.webhooks?.agotados === 0, JSON.stringify(hFin?.webhooks));

  console.log("\n== AC6 · un evento a medias tras un reinicio ==");
  const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    const [cred] = await sql`select organization_id from meta_credentials where phone_number_id = ${PN}`;
    const m6 = entrante("escribí justo cuando reiniciaron el servidor");
    const c6 = cuerpoWa(m6);
    await sql`
      insert into webhook_event (id, organization_id, fuente, payload, huella, status, attempts, leased_until)
      values (${`whe_e2e${RUN}`}, ${cred.organization_id}, 'whatsapp', ${sql.json(JSON.parse(c6))},
              ${createHmac("sha256", "x").update(c6).digest("hex")}, 'en_proceso', 1, now() - interval '1 minute')`;
    ok(
      "el barrido lo retoma y el mensaje entra (≤ 15 s)",
      (await hasta(async () => (await mensajesCon(m6.name, m6.text)).length === 1, 15000)) === true
    );
    const [fila] = await sql`select status, attempts from webhook_event where id = ${`whe_e2e${RUN}`}`;
    ok("queda procesado, en el segundo intento", fila?.status === "procesado" && fila?.attempts === 2, JSON.stringify(fila));
  } finally {
    await sql.end();
  }

  console.log("\n== AC7 · Instagram por Zernio ==");
  await api("/api/dev/zernio-mock/_reset", { method: "POST" });
  await api("/api/dev/zernio-mock/_accounts", {
    method: "POST",
    body: JSON.stringify({ accounts: [{ _id: CUENTA_IG, platform: "instagram", username: "ferre.ig", platformUserId: `1784${RUN}`, isActive: true, platformStatus: "active" }] }),
  });
  await api("/api/dev/zernio-mock/_webhooks", { method: "POST", body: JSON.stringify({ webhooks: [] }) });
  const ig = await api("/api/settings/instagram", {
    method: "PUT",
    body: JSON.stringify({ source: "zernio", token: LLAVE_ZERNIO, webhookSecret: SECRET_ZERNIO }),
  });
  ok("Instagram conectado por Zernio (simulador)", ig.res.ok, JSON.stringify(ig.json));
  await fallos(1);
  const nombreIg = `Seguidora047 ${RUN}`;
  const hilo = `zconv-047-${RUN}`;
  const cIg = JSON.stringify({
    id: `evt-047-${RUN}`,
    event: "message.received",
    message: {
      id: `zmsg-047-${RUN}`,
      conversationId: hilo,
      platform: "instagram",
      direction: "incoming",
      text: "vi su reel, ¿precio?",
      attachments: [],
      sender: { id: `igsid-${RUN}`, name: nombreIg, username: null },
      sentAt: new Date().toISOString(),
    },
    conversation: { id: hilo },
    account: { id: CUENTA_IG, accountId: CUENTA_IG, platform: "instagram" },
  });
  const sIg = await fetch(`${BASE}/api/webhooks/ig/${VT}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-zernio-signature": createHmac("sha256", SECRET_ZERNIO).update(cIg).digest("hex") },
    body: cIg,
  });
  ok("la ruta de Instagram responde 200", sIg.status === 200, String(sIg.status));
  ok(
    "el DM entra tras el reintento, una vez",
    (await hasta(async () => (await mensajesCon(nombreIg, "vi su reel, ¿precio?")).length === 1)) === true
  );

  console.log("\n== AC10 · un miembro sin permiso de configurar ==");
  const mEmail = `miembro-047-${RUN}@vocero.test`;
  const alta = await api("/api/settings/team", {
    method: "POST",
    body: JSON.stringify({ name: "Vendedor 047", email: mEmail, password: "password-miembro-047" }),
  });
  ok("alta del miembro", alta.res.status === 201, JSON.stringify(alta.json));
  const miembro = cliente();
  await miembro("/api/auth/sign-in/email", { method: "POST", body: JSON.stringify({ email: mEmail, password: "password-miembro-047" }) });
  ok("GET de entregas: 403", (await miembro("/api/settings/webhook/eventos")).res.status === 403);
  ok(
    "POST reintentar: 403",
    (await miembro("/api/settings/webhook/eventos", { method: "POST", body: JSON.stringify({ accion: "reintentar" }) })).res.status === 403
  );

  await browser.close();
  console.log(`\n${checks - failures}/${checks} checks en verde`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
