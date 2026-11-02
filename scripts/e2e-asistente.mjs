/**
 * Self-test E2E de comportamiento — f01, el asistente del asesor (guion
 * tests/e2e/us-asistente-asesor.md): reescribir el borrador, sugerir
 * respuesta y seguimiento, técnica de venta y recomendar plantilla con la
 * ventana cerrada. Cada acción solo propone: se comprueba también que nada
 * salga al cliente.
 *
 * Uso: node --env-file=.env scripts/e2e-asistente.mjs
 * Requiere: app corriendo con WA_MOCK_ENABLED=true, META_GRAPH_BASE_URL al
 * wa-mock, OPENROUTER_BASE_URL al ai-mock y BD migrada.
 */

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";

let cookie = "";
let failures = 0;
let checks = 0;

function ok(name, cond, extra = "") {
  checks++;
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      origin: BASE,
      ...(cookie ? { cookie } : {}),
      ...(opts.headers ?? {}),
    },
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) {
    cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  }
  let json = null;
  try {
    json = await res.clone().json();
  } catch {}
  return { res, json };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Re-ejecutable: identidades y textos llevan el sello de esta corrida.
const RUN = Date.now().toString(36);
const PN = `PN-F01-${RUN}`;
const CLIENTE = `Cliente F01 ${RUN}`;
const FALLA = `Cliente F01 falla ${RUN}`;

const redactar = (cuerpo) =>
  api("/api/inbox/asistente", { method: "POST", body: JSON.stringify(cuerpo) });
const sugerir = (conversationId, accion) =>
  api("/api/inbox/asistente/sugerencias", {
    method: "POST",
    body: JSON.stringify({ conversationId, accion }),
  });

async function conversacionDe(nombre) {
  for (let i = 0; i < 10; i++) {
    const convs = (await api("/api/conversations")).json?.conversations ?? [];
    const c = convs.find((x) => x.contact.name === nombre);
    if (c) return c;
    await sleep(500);
  }
  return null;
}

async function main() {
  console.log("== Setup: operador, número y un cliente que escribe ==");
  // Contra una BD que ya tiene dueño el registro está cerrado: se entra con
  // E2E_EMAIL / E2E_PASSWORD de una cuenta de prueba existente.
  const email = process.env.E2E_EMAIL ?? "e2e@vocero.test";
  const password = process.env.E2E_PASSWORD ?? "password-e2e-123";
  let su = await api("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({ email, password, name: "Operador E2E" }),
  });
  if (!su.res.ok) {
    su = await api("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }
  ok("registro o login del operador", su.res.ok, JSON.stringify(su.json));

  const conexion = await api("/api/settings/whatsapp", {
    method: "PUT",
    body: JSON.stringify({ wabaId: `WABA-F01-${RUN}`, phoneNumberId: PN, token: "tok-f01" }),
  });
  ok("número conectado al wa-mock", conexion.res.ok, JSON.stringify(conexion.json));

  const perfil = await api("/api/agent/profile");
  ok("la IA está activa (el botón se dibuja)", perfil.json?.aiConfigured === true, JSON.stringify(perfil.json?.aiConfigured));

  await api("/api/dev/wa-mock/inbound", {
    method: "POST",
    body: JSON.stringify({
      phoneNumberId: PN,
      from: `52155${Date.now().toString().slice(-8)}`,
      name: CLIENTE,
      text: "Hola, ¿cuánto cuesta el blanqueamiento?",
      waMessageId: `wamid.f01.${RUN}.1`,
    }),
  });
  const conv = await conversacionDe(CLIENTE);
  ok("la conversación del cliente existe", !!conv);
  if (!conv) return terminar();
  await api("/api/dev/wa-mock/outbox", { method: "DELETE" });

  console.log("\n== Fase 1: reescribir el borrador ==");
  const orto = await redactar({ accion: "ortografia", borrador: "hola como estas" });
  ok("corregir ortografía propone texto", orto.json?.text === "[ortografia] hola como estas", JSON.stringify(orto.json));
  for (const tono of ["profesional", "casual", "calido", "breve"]) {
    const r = await redactar({ accion: "tono", tono, borrador: "te mando la info" });
    ok(`tono ${tono}`, r.json?.text === `[tono-${tono}] te mando la info`, JSON.stringify(r.json));
  }
  const pulir = await redactar({ accion: "pulir", borrador: "ok" });
  ok("pulir propone texto", pulir.json?.text === "[pulir] ok", JSON.stringify(pulir.json));
  const sinTono = await redactar({ accion: "tono", borrador: "hola" });
  ok("cambio de tono sin tono es 422", sinTono.res.status === 422);
  const vacio = await redactar({ accion: "pulir", borrador: "   " });
  ok("borrador vacío es 422", vacio.res.status === 422);
  const falla = await redactar({ accion: "pulir", borrador: "prueba falla_proveedor" });
  ok(
    "proveedor que falla: 503 ai_unavailable que dice que el texto quedó intacto",
    falla.res.status === 503 && falla.json?.error?.code === "ai_unavailable" && /intacto/.test(falla.json?.error?.message ?? ""),
    JSON.stringify(falla.json)
  );

  console.log("\n== Fase 2: sugerencias con la ventana abierta ==");
  const resp = await sugerir(conv.id, "respuesta");
  ok(
    "sugerir respuesta trae tarjetas con enfoque y texto",
    resp.json?.tipo === "sugerencias" && resp.json.sugerencias.length >= 1 && resp.json.sugerencias.every((s) => s.enfoque && s.texto),
    JSON.stringify(resp.json)
  );
  ok(
    "una sugerencia deja el dato que falta como marcador",
    resp.json?.sugerencias?.some((s) => s.texto.includes("[precio]")),
    JSON.stringify(resp.json?.sugerencias)
  );
  const seg = await sugerir(conv.id, "seguimiento");
  ok("sugerir seguimiento con la ventana abierta trae texto", seg.json?.tipo === "sugerencias", JSON.stringify(seg.json));

  console.log("\n== Fase 3: técnica de venta ==");
  const tec = await sugerir(conv.id, "tecnica");
  ok(
    "la técnica viene del catálogo, con nombre, momento, porqué y ejemplo",
    tec.json?.tipo === "tecnica" &&
      tec.json.tecnica.clave === "cierre_alternativa" &&
      tec.json.tecnica.nombre === "Cierre por alternativa" &&
      tec.json.tecnica.ejemplo.length > 0,
    JSON.stringify(tec.json)
  );

  const outbox = (await api("/api/dev/wa-mock/outbox")).json?.outbox ?? [];
  ok("nada de lo anterior salió al cliente", outbox.length === 0, JSON.stringify(outbox));

  console.log("\n== Caminos infelices ==");
  const otra = await sugerir("cv_que_no_existe", "respuesta");
  ok("una conversación ajena o inexistente es 404", otra.res.status === 404, JSON.stringify(otra.json));
  const mala = await sugerir(conv.id, "enviar");
  ok("una acción inventada es 422", mala.res.status === 422);

  await api("/api/dev/wa-mock/inbound", {
    method: "POST",
    body: JSON.stringify({
      phoneNumberId: PN,
      from: `52156${Date.now().toString().slice(-8)}`,
      name: FALLA,
      text: "y si falla_proveedor qué pasa",
      waMessageId: `wamid.f01.${RUN}.2`,
    }),
  });
  const convFalla = await conversacionDe(FALLA);
  const caida = await sugerir(convFalla?.id, "respuesta");
  ok(
    "si el proveedor falla, la sugerencia es 503 ai_unavailable",
    caida.res.status === 503 && caida.json?.error?.code === "ai_unavailable",
    JSON.stringify(caida.json)
  );

  const sinAuth = await fetch(`${BASE}/api/inbox/asistente`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ accion: "pulir", borrador: "hola" }),
  });
  ok("sin sesión es 401", sinAuth.status === 401);

  await api("/api/settings/whatsapp", { method: "DELETE" });
  terminar();
}

function terminar() {
  console.log(`\n${failures === 0 ? "TODO VERDE" : "CON FALLOS"} — ${checks - failures}/${checks} checks`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
