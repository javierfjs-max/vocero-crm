/**
 * Self-test E2E — 050: notas internas en el hilo.
 * Guion: tests/e2e/us-notas-internas.md.
 *
 * Dos sesiones a la vez (la dueña y un miembro del equipo) sobre la misma
 * conversación: la nota se escribe en una, aparece en la otra sin recargar y
 * nunca sale al wa-mock.
 *
 * Requiere la app viva con WA_MOCK_ENABLED=true y META_GRAPH_BASE_URL →
 * wa-mock. `E2E_EMAIL` / `E2E_PASSWORD` para entrar con la dueña de una base
 * que ya tenga organización (si no, se crea).
 *
 * Uso: node --env-file=<env> scripts/e2e-notas-internas.mjs
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.E2E_EMAIL ?? "e2e-notas@vocero.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "password-e2e-notas";
const S = Date.now().toString(36);
const PN = `PN-NOTA-${S}`;

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
async function hasta(fn, ms = 15000) {
  const fin = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v || Date.now() > fin) return v;
    await espera(250);
  }
}

mkdirSync(".tmp", { recursive: true });
const browser = await chromium.launch();
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const apiA = (p, init = {}) => ctxA.request.fetch(`${BASE}${p}`, { ...init, headers: { origin: BASE, ...(init.headers ?? {}) } });

try {
  console.log("== Preparación ==");
  let r = await apiA("/api/auth/sign-up/email", { method: "POST", data: { email: EMAIL, password: PASSWORD, name: "Dueña" } });
  if (!r.ok()) r = await apiA("/api/auth/sign-in/email", { method: "POST", data: { email: EMAIL, password: PASSWORD } });
  ok("login de la dueña", r.ok());
  await apiA("/api/settings/whatsapp", { method: "PUT", data: { wabaId: "WABA-NOTA", phoneNumberId: PN, token: "tok-nota" } });
  const mEmail = `miembro-nota-${S}@vocero.test`;
  r = await apiA("/api/settings/team", { method: "POST", data: { name: "Laura Ventas", email: mEmail, password: "password-miembro-nota" } });
  ok("alta de un miembro (Laura)", r.status() === 201);
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const apiB = (p, init = {}) => ctxB.request.fetch(`${BASE}${p}`, { ...init, headers: { origin: BASE, ...(init.headers ?? {}) } });
  r = await apiB("/api/auth/sign-in/email", { method: "POST", data: { email: mEmail, password: "password-miembro-nota" } });
  ok("login de Laura", r.ok());

  const NOMBRE = `Cliente Nota ${S}`;
  const CERRADA = `Cliente Ayer ${S}`;
  const rnd = () => Math.floor(1000 + Math.random() * 8999);
  await apiA("/api/dev/wa-mock/inbound", { method: "POST", data: { phoneNumberId: PN, from: `52155550${rnd()}`, name: NOMBRE, text: `quiero 40 bultos ${S}` } });
  await apiA("/api/dev/wa-mock/inbound", { method: "POST", data: { phoneNumberId: PN, from: `52155551${rnd()}`, name: CERRADA, text: `hola de ayer ${S}`, timestamp: Math.floor(Date.now() / 1000) - 30 * 3600 } });
  const convDe = async (nombre) =>
    ((await (await apiA("/api/conversations")).json()).conversations ?? []).find((c) => c.contact.name === nombre) ?? null;
  const conv = await hasta(() => convDe(NOMBRE));
  const cerrada = await hasta(() => convDe(CERRADA));
  ok("las dos conversaciones existen", Boolean(conv && cerrada));
  // Se abre la conversación una vez para dejarla leída (como la ve la dueña).
  await apiA(`/api/conversations/${conv.id}`, { method: "PATCH", data: { markRead: true } });
  const antes = await convDe(NOMBRE);
  const outbox = async () => ((await (await apiA("/api/dev/wa-mock/outbox")).json()).outbox ?? []).length;
  const enviadosAntes = await outbox();

  // Las dos sesiones con la conversación abierta.
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  for (const p of [pageA, pageB]) {
    await p.goto(`${BASE}/inbox`);
    await p.getByText(NOMBRE).first().click();
    await p.getByText(`quiero 40 bultos ${S}`).first().waitFor();
  }

  console.log("\n== AC1 · escribir una nota ==");
  await pageA.getByRole("tab", { name: "Nota interna" }).click();
  const cajaNota = pageA.getByLabel("Nota interna", { exact: true });
  await cajaNota.fill(`Ofrécele 5 % si compra hoy ${S}`);
  await cajaNota.press("Enter");
  const notaA = pageA.locator("[data-nota-id]").filter({ hasText: `Ofrécele 5 % si compra hoy ${S}` });
  await notaA.waitFor({ timeout: 10000 }).catch(() => {});
  ok("la nota aparece en el hilo de la dueña", (await notaA.count()) === 1);
  ok("con «Nota interna», el autor y la hora", /Nota interna[\s\S]*Dueña[\s\S]*\d{2}:\d{2}/.test(await notaA.innerText()), await notaA.innerText().catch(() => ""));
  ok("el compositor de nota queda vacío", (await cajaNota.inputValue()) === "");
  await espera(800);
  ok("NINGÚN mensaje salió al wa-mock", (await outbox()) === enviadosAntes);
  await pageA.screenshot({ path: ".tmp/e2e-050-nota.png" });

  console.log("\n== AC2 · no es un mensaje ==");
  const despues = await convDe(NOMBRE);
  ok("mismo último mensaje (vista previa)", despues.lastMessage?.text === antes.lastMessage?.text, `${despues.lastMessage?.text} vs ${antes.lastMessage?.text}`);
  ok("misma hora de último mensaje", despues.lastMessageAt === antes.lastMessageAt);
  ok("sin no leídos nuevos", despues.unreadCount === antes.unreadCount, `${despues.unreadCount} vs ${antes.unreadCount}`);
  ok("la ventana no cambió", despues.windowOpen === antes.windowOpen && despues.windowRemainingMs <= antes.windowRemainingMs);
  const msgs = (await (await apiA(`/api/conversations/${conv.id}/messages`)).json()).messages ?? [];
  ok("no es un mensaje: no aparece en /messages", !msgs.some((m) => (m.text ?? "").includes("Ofrécele 5 %")));

  console.log("\n== AC4 · en vivo para Laura ==");
  const notaB = pageB.locator("[data-nota-id]").filter({ hasText: `Ofrécele 5 % si compra hoy ${S}` });
  await notaB.waitFor({ timeout: 10000 }).catch(() => {});
  ok("Laura la ve sin recargar", (await notaB.count()) === 1);
  ok("y no le ofrece borrarla (no es suya ni configura)", (await notaB.getByRole("button", { name: "Borrar nota interna" }).count()) === 0);

  console.log("\n== AC5 · borrar ==");
  const notas = (await (await apiA(`/api/conversations/${conv.id}/notes`)).json()).notas ?? [];
  const laNota = notas.find((x) => x.texto.includes("Ofrécele 5 %"));
  r = await apiB(`/api/conversations/${conv.id}/notes/${laNota.id}`, { method: "DELETE" });
  ok("Laura intenta borrarla por API → 403", r.status() === 403);
  // Laura escribe la suya.
  await pageB.getByRole("tab", { name: "Nota interna" }).click();
  await pageB.getByLabel("Nota interna", { exact: true }).fill(`Le mandé la cotización ${S}`);
  await pageB.getByRole("button", { name: "Guardar nota", exact: true }).click();
  const notaLaura = pageA.locator("[data-nota-id]").filter({ hasText: `Le mandé la cotización ${S}` });
  await notaLaura.waitFor({ timeout: 10000 }).catch(() => {});
  ok("la de Laura aparece en vivo en la dueña, firmada por Laura", (await notaLaura.count()) === 1 && /Laura Ventas/.test(await notaLaura.innerText()));
  const notasB = (await (await apiB(`/api/conversations/${conv.id}/notes`)).json()).notas ?? [];
  ok("cada quien ve su permiso: Laura puede borrar la suya y no la de la dueña", notasB.find((x) => x.texto.includes("cotización"))?.puedeBorrar === true && notasB.find((x) => x.texto.includes("Ofrécele"))?.puedeBorrar === false);
  // La dueña (configura) borra la de Laura desde la interfaz.
  pageA.once("dialog", (d) => d.accept());
  await notaLaura.getByRole("button", { name: "Borrar nota interna" }).click();
  await notaLaura.waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
  ok("quien configura borra la de otro, desde la interfaz", (await notaLaura.count()) === 0);
  const notaLauraEnB = pageB.locator("[data-nota-id]").filter({ hasText: `Le mandé la cotización ${S}` });
  await notaLauraEnB.waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
  ok("y desaparece en vivo en la sesión de Laura", (await notaLauraEnB.count()) === 0);

  console.log("\n== AC3 · ventana cerrada ==");
  await pageA.getByText(CERRADA).first().click();
  await pageA.getByText(/La ventana de 24 horas está cerrada/).waitFor({ timeout: 10000 }).catch(() => {});
  ok("con la ventana cerrada siguen las pestañas", (await pageA.getByRole("tab", { name: "Nota interna" }).count()) === 1);
  ok("Responder sigue ofreciendo plantillas", (await pageA.getByText(/envía una plantilla aprobada/).count()) === 1);
  await pageA.getByRole("tab", { name: "Nota interna" }).click();
  await pageA.getByLabel("Nota interna", { exact: true }).fill(`Esperar a que conteste la plantilla ${S}`);
  await pageA.getByLabel("Nota interna", { exact: true }).press("Enter");
  const notaCerrada = pageA.locator("[data-nota-id]").filter({ hasText: `Esperar a que conteste la plantilla ${S}` });
  await notaCerrada.waitFor({ timeout: 10000 }).catch(() => {});
  ok("la nota se guarda con la ventana cerrada", (await notaCerrada.count()) === 1);
  ok("y sin enviar nada", (await outbox()) === enviadosAntes);

  console.log("\n== AC6 · validación y organización ==");
  r = await apiA(`/api/conversations/${conv.id}/notes`, { method: "POST", data: { texto: "   " } });
  ok("texto vacío → 422", r.status() === 422);
  r = await apiA(`/api/conversations/cv_no_existe_${S}/notes`, { method: "POST", data: { texto: "x" } });
  ok("conversación que no es de la organización → 404", r.status() === 404);
  r = await apiA(`/api/conversations/cv_no_existe_${S}/notes`);
  ok("listar de una conversación ajena → 404", r.status() === 404);

  console.log("\n== AC7 · celular ==");
  await pageA.setViewportSize({ width: 390, height: 844 });
  await pageA.reload();
  await pageA.getByText(NOMBRE).first().click();
  await pageA.getByRole("tab", { name: "Nota interna" }).waitFor();
  await pageA.getByRole("tab", { name: "Nota interna" }).click();
  const desborde = await pageA.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok("a 390 px, pestañas y nota sin desplazamiento horizontal", !desborde);
  await pageA.screenshot({ path: ".tmp/e2e-050-nota-390.png" });
  await ctxB.close();
} finally {
  await browser.close();
}

console.log(`\n${checks - failures}/${checks} checks en verde`);
process.exit(failures > 0 ? 1 : 0);
