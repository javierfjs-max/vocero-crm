/**
 * Self-test E2E de comportamiento — arrastrar una imagen al chat (spec 043,
 * guion tests/e2e/us-arrastrar-imagen.md).
 *
 * Conduce la UI real con Playwright contra wa-mock con eventos de arrastre
 * que llevan un `DataTransfer` con archivos, como los que manda el sistema al
 * arrastrar desde el escritorio. Ningún mensaje sale a Meta.
 *
 * Uso: node --env-file=.env scripts/e2e-arrastrar-imagen.mjs
 * Requiere: app corriendo con WA_MOCK_ENABLED=true y BD migrada.
 */
import { chromium } from "playwright";

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";
const PN = "PN-DROP-1";
const S = Math.random().toString(36).slice(2, 6).toUpperCase();
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

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
if (!su.ok()) su = await req.post(`${BASE}/api/auth/sign-in/email`, { data: { email, password } });
ok("registro o login del operador", su.ok());
const conn = await req.put(`${BASE}/api/settings/whatsapp`, {
  data: { wabaId: "WABA-DROP", phoneNumberId: PN, token: "tok-drop" },
});
ok("conexión WhatsApp guardada", conn.ok());

const rnd = () => Math.floor(1000 + Math.random() * 8999);
const NAME = `Arrastre${S}`;
const NAME_CERRADA = `ArrastreCerrada${S}`;
await req.post(`${BASE}/api/dev/wa-mock/inbound`, {
  data: { phoneNumberId: PN, from: `52155550${rnd()}`, name: NAME, text: `Hola ${S}` },
});
await req.post(`${BASE}/api/dev/wa-mock/inbound`, {
  data: {
    phoneNumberId: PN,
    from: `52155551${rnd()}`,
    name: NAME_CERRADA,
    text: `Hola de ayer ${S}`,
    timestamp: Math.floor(Date.now() / 1000) - 30 * 3600,
  },
});
let conv = null;
await until(async () => {
  const d = await (await req.get(`${BASE}/api/conversations`)).json();
  conv = (d.conversations ?? []).find((c) => c.contact.name === NAME) ?? null;
  const otra = (d.conversations ?? []).find((c) => c.contact.name === NAME_CERRADA);
  return Boolean(conv && otra);
});
ok("las dos conversaciones existen", Boolean(conv));
if (!conv) {
  await browser.close();
  process.exit(1);
}
const outbox = async () =>
  (await (await req.get(`${BASE}/api/dev/wa-mock/outbox`)).json()).outbox ?? [];
const enviadosA = (await outbox()).length;
const mensajes = async () =>
  (await (await req.get(`${BASE}/api/conversations/${conv.id}/messages`)).json()).messages ?? [];

const page = await ctx.newPage();
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && /same key|Each child/.test(m.text())) errores.push(m.text().slice(0, 160));
});
await page.goto(`${BASE}/inbox`);
await page.getByText(NAME).first().click();
const box = page.getByPlaceholder("Escribe una respuesta");
await box.waitFor({ timeout: 20000 });

const zona = page.getByRole("region", { name: "Chat: adjuntar imagen" });
const aviso = page.getByText("Suelta la imagen para adjuntarla");
const quitar = page.getByRole("button", { name: "Quitar adjunto" });
const pie = page.getByPlaceholder("Pie del adjunto (opcional)…");
const alerta = page.locator('p[role="alert"]');

/** Un DataTransfer como el del sistema; `modo` decide qué lleva. */
const datos = (modo = "imagen", nombre = "arrastrada.png") =>
  page.evaluateHandle(
    ({ b64, modo, nombre }) => {
      const dt = new DataTransfer();
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      if (modo === "texto") dt.setData("text/plain", "texto arrastrado");
      else if (modo === "pdf") dt.items.add(new File([bytes], "doc.pdf", { type: "application/pdf" }));
      else if (modo === "grande")
        dt.items.add(new File([new Uint8Array(6 * 1024 * 1024)], "g.png", { type: "image/png" }));
      else if (modo === "dos") {
        dt.items.add(new File([bytes], "a.png", { type: "image/png" }));
        dt.items.add(new File([bytes], "b.png", { type: "image/png" }));
      } else dt.items.add(new File([bytes], nombre, { type: "image/png" }));
      return dt;
    },
    { b64: PNG_B64, modo, nombre },
  );
const soltar = async (modo = "imagen", destino = zona, nombre) => {
  const dt = await datos(modo, nombre);
  await destino.dispatchEvent("dragenter", { dataTransfer: dt });
  await destino.dispatchEvent("dragover", { dataTransfer: dt });
  await destino.dispatchEvent("drop", { dataTransfer: dt });
  await dt.dispose();
};

console.log("\n== El indicador ==");
const dt1 = await datos();
await zona.dispatchEvent("dragenter", { dataTransfer: dt1 });
ok("arrastrar un archivo sobre el chat enseña el indicador", await aviso.isVisible());
const burbuja = zona.getByText(`Hola ${S}`, { exact: true });
await burbuja.dispatchEvent("dragenter", { dataTransfer: dt1 });
await zona.dispatchEvent("dragleave", { dataTransfer: dt1 });
ok("pasar por un elemento de dentro no lo quita", await aviso.isVisible());
await burbuja.dispatchEvent("dragleave", { dataTransfer: dt1 });
ok("salir del área lo quita", await until(async () => !(await aviso.isVisible()), 2000));
await dt1.dispose();
const dtTexto = await datos("texto");
await zona.dispatchEvent("dragenter", { dataTransfer: dtTexto });
ok("arrastrar texto no enseña el indicador", !(await aviso.isVisible()));
await zona.dispatchEvent("dragleave", { dataTransfer: dtTexto });
await dtTexto.dispose();

console.log("\n== Soltar una imagen ==");
await box.fill(`Borrador ${S}`);
await soltar("imagen", page.locator(".thread-bg").first(), "sobre-hilo.png");
ok("soltar sobre el hilo la adjunta", await until(async () => (await quitar.count()) === 1, 5000));
ok("con vista previa", (await page.locator('img[src^="blob:"]').count()) === 1);
ok("el texto escrito se queda (como pie)", (await pie.inputValue()) === `Borrador ${S}`);
ok("soltar no envía", (await outbox()).length === enviadosA);
ok("y no cambia de página", page.url().startsWith(`${BASE}/inbox`));
await quitar.click();

await soltar("imagen", box, "sobre-campo.png");
ok("soltar sobre el campo también", await until(async () => (await page.getByText("sobre-campo.png").count()) === 1, 5000));

console.log("\n== Lo que no sirve no pisa nada ==");
await soltar("pdf");
ok("un PDF avisa", (await alerta.innerText()).includes("JPEG, PNG o WebP"));
await soltar("dos");
ok("dos a la vez avisa", (await alerta.innerText()).includes("Arrastra una imagen a la vez"));
await soltar("grande");
ok("más de 5 MB avisa", (await alerta.innerText()).includes("5 MB"));
ok(
  "el adjunto y el pie siguen",
  (await page.getByText("sobre-campo.png").count()) === 1 && (await pie.inputValue()) === `Borrador ${S}`,
);

console.log("\n== Mientras sube, no se reemplaza ==");
let soltarRuta;
const retenido = new Promise((r) => (soltarRuta = r));
await page.route("**/messages/media", async (route) => {
  await retenido;
  await route.continue();
});
await pie.fill(`Pie arrastrado ${S}`);
await page.getByRole("button", { name: "Enviar", exact: true }).click();
await until(async () => await quitar.isDisabled(), 3000);
await soltar("imagen", zona, "intrusa.png");
ok("soltar otra durante el envío no la reemplaza", (await page.getByText("intrusa.png").count()) === 0);
soltarRuta();
let salido = null;
await until(async () => {
  salido = (await mensajes()).find((m) => m.media?.caption === `Pie arrastrado ${S}`) ?? null;
  return Boolean(salido);
}, 15000);
await page.unroute("**/messages/media");
ok("la imagen soltada sale al hilo con su pie", Boolean(salido));
ok(
  "y a Graph una sola vez",
  (await outbox()).filter((o) => o.body?.image?.caption === `Pie arrastrado ${S}`).length === 1,
);
ok("el compositor queda limpio", await until(async () => (await quitar.count()) === 0, 5000));

console.log("\n== Fuera del chat ==");
const lista = page.getByRole("button", { name: new RegExp(NAME_CERRADA) }).first();
const dtFuera = await datos();
const prevenido = await lista.evaluate((el, dt) => {
  const ev = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt });
  el.dispatchEvent(ev);
  return ev.defaultPrevented;
}, dtFuera);
await dtFuera.dispose();
ok("soltar un archivo en la lista no abre el archivo en la pestaña", prevenido);
ok("ni adjunta nada", (await quitar.count()) === 0);

console.log("\n== Ventana cerrada ==");
await page.getByText(NAME_CERRADA).first().click();
await page.getByText("La ventana de 24 horas está cerrada.").waitFor({ timeout: 10000 });
const dtCerrada = await datos();
await zona.dispatchEvent("dragenter", { dataTransfer: dtCerrada });
ok("no enseña el indicador", !(await aviso.isVisible()));
await zona.dispatchEvent("drop", { dataTransfer: dtCerrada });
await dtCerrada.dispose();
ok(
  "soltar avisa que la ventana está cerrada",
  await until(async () => (await alerta.innerText().catch(() => "")).includes("ventana está cerrada"), 3000),
);
ok("y no adjunta", (await quitar.count()) === 0);

console.log("\n== Cambiar de conversación limpia el indicador ==");
await page.getByText(NAME).first().click();
await box.waitFor({ timeout: 10000 });
const dtCambio = await datos();
await zona.dispatchEvent("dragenter", { dataTransfer: dtCambio });
ok("el indicador aparece", await aviso.isVisible());
await page.getByText(NAME_CERRADA).first().click();
await page.getByText("La ventana de 24 horas está cerrada.").waitFor({ timeout: 10000 });
ok("al cambiar de conversación ya no está", !(await aviso.isVisible()));
await dtCambio.dispose();

ok("ningún envío de más", (await outbox()).length === enviadosA + 1);
ok("sin errores de la página", errores.length === 0, errores.join(" | "));

await browser.close();
console.log(`\n${checks - failures}/${checks} comprobaciones en verde`);
process.exit(failures ? 1 : 0);
