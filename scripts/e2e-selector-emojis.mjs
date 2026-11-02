/**
 * Self-test E2E de comportamiento — selector de emojis (spec 041, guion
 * tests/e2e/us-selector-emojis.md).
 *
 * Conduce la UI real con Playwright contra wa-mock: abrir con el teclado,
 * buscar sin acentos, insertar en el cursor y sobre una selección, varios
 * seguidos, cerrar con Escape y con un clic fuera, el pie de un adjunto, la
 * ventana cerrada y el panel en un teléfono. Nada de eso envía; el envío
 * explícito llega intacto a Graph.
 *
 * Uso: node --env-file=.env scripts/e2e-selector-emojis.mjs
 * Requiere: app corriendo con WA_MOCK_ENABLED=true y BD migrada.
 */
import { chromium } from "playwright";

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";
const PN = "PN-EMOJI-1";
const S = Math.random().toString(36).slice(2, 6).toUpperCase();

let failures = 0;
let checks = 0;
const ok = (name, cond, extra = "") => {
  checks++;
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`);
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return true;
    await sleep(150);
  }
  return false;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const req = ctx.request;

console.log("== Setup: operador, conexión y dos conversaciones ==");
const email = "e2e@vocero.test";
const password = "password-e2e-123";
let su = await req.post(`${BASE}/api/auth/sign-up/email`, {
  data: { email, password, name: "Operador E2E" },
});
if (!su.ok()) {
  su = await req.post(`${BASE}/api/auth/sign-in/email`, { data: { email, password } });
}
ok("registro o login del operador", su.ok());
const conn = await req.put(`${BASE}/api/settings/whatsapp`, {
  data: { wabaId: "WABA-EMOJI", phoneNumberId: PN, token: "tok-emoji" },
});
ok("conexión WhatsApp guardada", conn.ok());

const NAME = `Emojis${S}`;
const NAME_CERRADA = `EmojisCerrada${S}`;
const rnd = () => Math.floor(1000 + Math.random() * 8999);
await req.post(`${BASE}/api/dev/wa-mock/inbound`, {
  data: { phoneNumberId: PN, from: `52155530${rnd()}`, name: NAME, text: `Hola ${S}` },
});
await req.post(`${BASE}/api/dev/wa-mock/inbound`, {
  data: {
    phoneNumberId: PN,
    from: `52155531${rnd()}`,
    name: NAME_CERRADA,
    text: `Hola de ayer ${S}`,
    timestamp: Math.floor(Date.now() / 1000) - 30 * 3600,
  },
});

const conversacion = async (name) => {
  let found = null;
  await until(async () => {
    const d = await (await req.get(`${BASE}/api/conversations`)).json();
    found = (d.conversations ?? []).find((c) => c.contact.name === name) ?? null;
    return Boolean(found);
  });
  return found;
};
const conv = await conversacion(NAME);
const cerrada = await conversacion(NAME_CERRADA);
ok("las dos conversaciones existen", Boolean(conv && cerrada));
if (!conv || !cerrada) {
  await browser.close();
  process.exit(1);
}
const outbox = async () =>
  (await (await req.get(`${BASE}/api/dev/wa-mock/outbox`)).json()).outbox ?? [];
const mensajesA = (await outbox()).length;

const page = await ctx.newPage();
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
await page.goto(`${BASE}/inbox`);
await page.getByText(NAME).first().click();
const box = page.getByPlaceholder("Escribe una respuesta");
await box.waitFor({ timeout: 20000 });

const boton = page.getByRole("button", { name: "Emojis", exact: true });
const panel = page.getByRole("dialog", { name: "Selector de emojis" });
const buscar = panel.getByRole("searchbox", { name: "Buscar emojis" });
const elegir = (label) =>
  panel.getByRole("button", { name: `Insertar emoji: ${label}`, exact: true }).click();
const enfocado = (loc) => loc.evaluate((el) => el === document.activeElement);

console.log("\n== Abrir, elegir y cerrar ==");
await boton.focus();
await boton.press("Enter");
await panel.waitFor({ timeout: 5000 });
ok("Enter sobre el botón abre el panel", await panel.isVisible());
ok("el botón dice que está abierto", (await boton.getAttribute("aria-expanded")) === "true");
ok("el foco va a la búsqueda", await enfocado(buscar));
await elegir("Sonrisa");
ok("elegir inserta el emoji en el campo", (await box.inputValue()) === "😀");
ok("y el panel sigue abierto", await panel.isVisible());
await page.keyboard.press("Escape");
ok("Escape cierra el panel", await until(async () => !(await panel.isVisible()), 3000));
ok("y devuelve el foco al botón", await enfocado(boton));

console.log("\n== Cursor, selección y búsqueda ==");
await box.fill("Hola mundo, gracias");
await box.evaluate((el) => {
  el.focus();
  el.setSelectionRange(5, 10);
});
await boton.click();
await buscar.fill("corazon en llamas");
await elegir("Corazón en llamas");
ok("reemplaza solo la selección", (await box.inputValue()) === "Hola ❤️‍🔥, gracias", await box.inputValue());
ok(
  "el cursor queda detrás del emoji compuesto",
  (await box.evaluate((el) => el.selectionStart)) === 5 + "❤️‍🔥".length,
);
await buscar.fill("");
await elegir("Sonrisa");
ok("el siguiente entra en el cursor", (await box.inputValue()) === "Hola ❤️‍🔥😀, gracias", await box.inputValue());
await panel.getByRole("button", { name: "Celebración", exact: true }).click();
ok(
  "la categoría filtra",
  (await panel.getByRole("button", { name: "Insertar emoji: Sonrisa", exact: true }).count()) === 0 &&
    (await panel.getByRole("button", { name: "Insertar emoji: Confeti", exact: true }).count()) === 1,
);
await elegir("Confeti");
await elegir("Confeti");
ok("varios seguidos sin reabrir", (await box.inputValue()) === "Hola ❤️‍🔥😀🎊🎊, gracias", await box.inputValue());
await buscar.fill("emojisincoincidencias");
ok(
  "sin coincidencias, el panel lo dice",
  (await panel.getByRole("status").innerText()).includes("No hay emojis") &&
    (await panel.getByRole("button", { name: /Insertar emoji:/ }).count()) === 0,
);
await buscar.fill("");
await page.getByText(NAME).first().click();
ok("un clic fuera cierra", await until(async () => !(await panel.isVisible()), 3000));
await boton.click();
ok("al reabrir, la búsqueda está vacía", (await buscar.inputValue()) === "");
await panel.getByRole("button", { name: "Cerrar emojis" }).click();
ok("la X cierra", await until(async () => !(await panel.isVisible()), 3000));

await box.fill("A😀B");
await box.evaluate((el) => {
  el.focus();
  el.setSelectionRange(1, 3);
});
await boton.click();
await elegir("Sonrisa");
ok(
  "reemplazar un emoji por el mismo deja el cursor detrás",
  (await box.inputValue()) === "A😀B" &&
    (await box.evaluate((el) => el === document.activeElement && el.selectionStart === 3)),
);
await page.keyboard.press("Escape");
ok("nada de esto envió", (await outbox()).length === mensajesA);

console.log("\n== Enviar ==");
const TEXTO = `Pedido confirmado 🎊❤️‍🔥 ${S}`;
await box.fill(TEXTO);
await box.press("Enter");
ok(
  "el texto con emojis llega intacto a Graph",
  await until(async () => (await outbox()).some((o) => o.body?.text?.body === TEXTO), 15000),
);
ok(
  "y al hilo",
  await until(async () => {
    const d = await (await req.get(`${BASE}/api/conversations/${conv.id}/messages`)).json();
    return (d.messages ?? []).some((m) => m.text === TEXTO);
  }),
);
ok("el campo queda vacío", (await box.inputValue()) === "");

console.log("\n== Pie de un adjunto ==");
await page.locator('input[type="file"]').setInputFiles({
  name: "foto.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
});
const pie = page.getByPlaceholder("Pie del adjunto (opcional)…");
await pie.waitFor({ timeout: 5000 });
await pie.fill("Pie");
await boton.click();
await buscar.fill("pulgar arriba");
await elegir("Pulgar arriba");
ok("el emoji va al pie", (await pie.inputValue()) === "Pie👍");
ok(
  "y el adjunto sigue elegido",
  (await page.getByRole("button", { name: "Quitar adjunto" }).count()) === 1,
);
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Quitar adjunto" }).click();
await box.fill("");

console.log("\n== Ventana cerrada ==");
await page.getByText(NAME_CERRADA).first().click();
await page.getByText("La ventana de 24 horas está cerrada.").waitFor({ timeout: 10000 });
ok("con la ventana cerrada no hay botón de emojis", (await boton.count()) === 0);

console.log("\n== En un teléfono ==");
const movil = await browser.newContext({
  viewport: { width: 390, height: 780 },
  storageState: await ctx.storageState(),
});
const tel = await movil.newPage();
await tel.goto(`${BASE}/inbox`);
await tel.getByText(NAME).first().click();
const boxTel = tel.getByPlaceholder("Escribe una respuesta");
await boxTel.waitFor({ timeout: 20000 });
const panelTel = tel.getByRole("dialog", { name: "Selector de emojis" });
await tel.getByRole("button", { name: "Emojis", exact: true }).click();
await panelTel.getByRole("searchbox", { name: "Buscar emojis" }).fill("corazon");
const rp = await panelTel.boundingBox();
const rc = await boxTel.boundingBox();
ok(
  "el panel cabe en 390 px",
  Boolean(rp && rp.x >= 0 && rp.y >= 0 && rp.x + rp.width <= 390),
  JSON.stringify(rp),
);
ok("y no tapa el campo", Boolean(rp && rc && rp.y + rp.height <= rc.y), JSON.stringify({ rp, rc }));
ok(
  "sin desplazamiento horizontal",
  await tel.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
);
await panelTel.getByRole("button", { name: "Insertar emoji: Corazón rojo", exact: true }).click();
ok("elegir en el teléfono también inserta", (await boxTel.inputValue()) === "❤️");
await movil.close();

ok("ningún envío de más", (await outbox()).length === mensajesA + 1);
ok("sin errores de la página", errores.length === 0, errores.join(" | "));

await browser.close();
console.log(`\n${checks - failures}/${checks} comprobaciones en verde`);
process.exit(failures ? 1 : 0);
