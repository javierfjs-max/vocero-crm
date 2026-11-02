"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { atajoBandeja } from "@/lib/atajos";
import { hayDialogoAbierto } from "@/components/atajos-globales";

/**
 * f01 — Asistente del asesor en el compositor.
 *
 * - Redacción (fase 1): corrige, pule o cambia el tono del borrador. Solo ve
 *   el borrador; la propuesta lo reemplaza y el compositor ofrece deshacer.
 * - Sugerencias (fases 2 y 3): respuesta, seguimiento y técnica de venta,
 *   leyendo la conversación. Salen en tarjetas; «Usar» las pasa al borrador
 *   para editarlas.
 *
 * Nada se envía desde aquí: enviar sigue siendo del asesor.
 */

type CuerpoRedaccion = {
  accion: "ortografia" | "pulir" | "tono";
  tono?: "profesional" | "casual" | "calido" | "breve";
};
type AccionSugerencia = "respuesta" | "seguimiento" | "tecnica";

type Opcion = { clave: string; etiqueta: string; ayuda: string } & (
  | { grupo: "redaccion"; cuerpo: CuerpoRedaccion }
  | { grupo: "sugerir"; accion: AccionSugerencia }
);

const OPCIONES: Opcion[] = [
  { grupo: "redaccion", clave: "ortografia", etiqueta: "Corregir ortografía", ayuda: "Acentos, puntuación y gramática", cuerpo: { accion: "ortografia" } },
  { grupo: "redaccion", clave: "pulir", etiqueta: "Pulir redacción", ayuda: "Más claro, en el tono de tu marca", cuerpo: { accion: "pulir" } },
  { grupo: "redaccion", clave: "profesional", etiqueta: "Tono profesional", ayuda: "Formal y cortés", cuerpo: { accion: "tono", tono: "profesional" } },
  { grupo: "redaccion", clave: "casual", etiqueta: "Tono casual", ayuda: "Cercano y relajado", cuerpo: { accion: "tono", tono: "casual" } },
  { grupo: "redaccion", clave: "calido", etiqueta: "Tono cálido", ayuda: "Empático y amable", cuerpo: { accion: "tono", tono: "calido" } },
  { grupo: "redaccion", clave: "breve", etiqueta: "Más breve", ayuda: "Lo mismo en menos palabras", cuerpo: { accion: "tono", tono: "breve" } },
  { grupo: "sugerir", clave: "respuesta", etiqueta: "Sugerir respuesta", ayuda: "Al último mensaje del cliente", accion: "respuesta" },
  { grupo: "sugerir", clave: "seguimiento", etiqueta: "Sugerir seguimiento", ayuda: "Para reactivar a quien no contesta", accion: "seguimiento" },
  { grupo: "sugerir", clave: "tecnica", etiqueta: "Técnica de venta", ayuda: "Qué aplicar ahora y un ejemplo", accion: "tecnica" },
];

type Resultado =
  | { tipo: "sugerencias"; titulo: string; sugerencias: { enfoque: string; texto: string }[] }
  | {
      tipo: "tecnica";
      tecnica: { clave: string; nombre: string; momento: string; porque: string; ejemplo: string };
    };

/** Un dato que el asistente no sabía y dejó marcado para el asesor: `[precio]`. */
const tieneMarcadores = (t: string) => /\[[^\]\n]{1,40}\]/.test(t);

async function pedir<T>(url: string, cuerpo: unknown): Promise<{ ok: true; data: T } | { ok: false; mensaje: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const data = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
    if (!res.ok || !data) return { ok: false, mensaje: data?.error?.message ?? `Error ${res.status}` };
    return { ok: true, data };
  } catch {
    return { ok: false, mensaje: "No se pudo conectar con el servidor." };
  }
}

/** Sin IA activa el asistente no se dibuja: un botón que solo sabe fallar es peor que no tenerlo. */
function useIaActiva(): boolean {
  const [activa, setActiva] = useState(false);
  useEffect(() => {
    let vivo = true;
    fetch("/api/agent/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { aiConfigured?: boolean } | null) => {
        if (vivo) setActiva(Boolean(d?.aiConfigured));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  return activa;
}

export function AsistenteAsesor({
  conversationId,
  texto,
  disabled,
  onAplicar,
  onError,
  onCerrar,
}: {
  conversationId: string;
  texto: string;
  disabled: boolean;
  /** El texto propuesto: reemplaza al borrador actual (el compositor ofrece deshacer). */
  onAplicar: (propuesta: string) => void;
  /** El error a mostrar bajo la caja, o `null` para limpiarlo. */
  onError: (mensaje: string | null) => void;
  /** Al cerrar el menú o el panel: el foco vuelve a la caja. */
  onCerrar?: () => void;
}) {
  const iaActiva = useIaActiva();
  const [open, setOpen] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [activa, setActiva] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  // El texto de AHORA: si el asesor siguió escribiendo mientras la IA pensaba,
  // la reescritura llega tarde y no debe pisar lo nuevo.
  const textoActual = useRef(texto);
  useEffect(() => {
    textoActual.current = texto;
  }, [texto]);
  const id = useId();
  const sinTexto = !texto.trim();
  const visible = open && !disabled && !trabajando;
  const habilitada = (o: Opcion) => o.grupo === "sugerir" || !sinTexto;

  function abrir() {
    setResultado(null);
    setActiva(Math.max(0, OPCIONES.findIndex(habilitada)));
    setOpen(true);
  }

  // 055 — Alt+A abre el menú, también escribiendo en la caja.
  useEffect(() => {
    if (!iaActiva) return;
    const onKey = (e: KeyboardEvent) => {
      if (atajoBandeja(e) !== "asistente" || hayDialogoAbierto()) return;
      e.preventDefault();
      setResultado(null);
      setActiva(0);
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [iaActiva]);

  useEffect(() => {
    if (!visible) return;
    items.current[activa]?.focus();
  }, [visible, activa]);

  // Clic fuera o Escape cierran el menú y el panel. En el documento y no en el
  // menú: con la caja vacía parte de las opciones no reciben foco.
  const abierto = visible || resultado !== null;
  useEffect(() => {
    if (!abierto) return;
    function fuera(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
        setResultado(null);
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      setOpen(false);
      setResultado(null);
      onCerrar?.();
    }
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto, onCerrar]);

  async function elegir(o: Opcion) {
    if (!habilitada(o) || trabajando) return;
    setOpen(false);
    setTrabajando(true);
    onError(null);
    try {
      if (o.grupo === "redaccion") {
        const borrador = texto;
        const r = await pedir<{ text: string }>("/api/inbox/asistente", { ...o.cuerpo, borrador });
        if (!r.ok) {
          // El 503 del servidor ya lo dice; un fallo de red o un 422, no.
          onError(/intacto/.test(r.mensaje) ? r.mensaje : `${r.mensaje} Tu texto quedó intacto.`);
          return;
        }
        if (textoActual.current !== borrador) {
          onError("Cambiaste el texto mientras tanto: vuelve a pedirlo.");
          return;
        }
        onAplicar(r.data.text);
        onCerrar?.();
        return;
      }
      const r = await pedir<
        | { tipo: "sugerencias"; sugerencias: { enfoque: string; texto: string }[] }
        | { tipo: "tecnica"; tecnica: Extract<Resultado, { tipo: "tecnica" }>["tecnica"] }
      >("/api/inbox/asistente/sugerencias", { conversationId, accion: o.accion });
      if (!r.ok) {
        onError(r.mensaje);
        return;
      }
      setResultado(
        r.data.tipo === "tecnica"
          ? { tipo: "tecnica", tecnica: r.data.tecnica }
          : { tipo: "sugerencias", titulo: o.etiqueta, sugerencias: r.data.sugerencias }
      );
    } finally {
      setTrabajando(false);
    }
  }

  function usar(propuesta: string) {
    setResultado(null);
    onAplicar(propuesta);
    onCerrar?.();
  }

  function mover(dir: 1 | -1) {
    const n = OPCIONES.length;
    let i = activa;
    for (let paso = 0; paso < n; paso++) {
      i = (i + dir + n) % n;
      if (habilitada(OPCIONES[i]!)) break;
    }
    setActiva(i);
  }

  if (!iaActiva) return null;

  return (
    <div ref={root} className="contents">
      <button
        type="button"
        disabled={disabled || trabajando}
        aria-label="Asistente del asesor"
        title="Asistente del asesor (Alt+A)"
        aria-haspopup="menu"
        aria-expanded={visible}
        aria-controls={visible ? id : undefined}
        aria-busy={trabajando}
        className={cn(
          "shrink-0 rounded p-1.5 text-text-3 transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40",
          (visible || resultado) && "bg-brand-tint text-brand-ink",
          trabajando && "animate-pulse text-brand"
        )}
        onClick={() => (open ? setOpen(false) : abrir())}
      >
        <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </button>

      {visible && (
        <div
          id={id}
          role="menu"
          aria-label="Asistente del asesor"
          className="absolute bottom-full left-2 z-30 mb-2 max-h-[min(460px,60dvh)] w-[min(290px,calc(100%-1rem))] overflow-y-auto rounded-xl border border-border-strong bg-popover p-1.5 text-popover-foreground shadow-xl"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              mover(e.key === "ArrowDown" ? 1 : -1);
            }
          }}
        >
          {(["redaccion", "sugerir"] as const).map((grupo) => (
            <div key={grupo} role="group" aria-label={grupo === "redaccion" ? "Redacción" : "Sugerir"}>
              <p className="px-2.5 pb-1 pt-1.5 text-xs font-semibold text-text-3">
                {grupo === "redaccion"
                  ? sinTexto
                    ? "Redacción · escribe algo primero"
                    : "Redacción · cambia tu borrador"
                  : "Sugerir · lee la conversación"}
              </p>
              {OPCIONES.map((o, i) =>
                o.grupo !== grupo ? null : (
                  <button
                    key={o.clave}
                    ref={(el) => {
                      items.current[i] = el;
                    }}
                    type="button"
                    role="menuitem"
                    data-accion={o.clave}
                    disabled={!habilitada(o)}
                    tabIndex={i === activa ? 0 : -1}
                    onClick={() => void elegir(o)}
                    onMouseEnter={() => habilitada(o) && setActiva(i)}
                    className={cn(
                      "flex w-full flex-col items-start rounded-md px-2.5 py-1.5 text-left outline-none transition-colors disabled:opacity-40",
                      i === activa && habilitada(o) && "bg-secondary"
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{o.etiqueta}</span>
                    <span className="text-xs text-text-3">{o.ayuda}</span>
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {resultado && (
        <div
          role="dialog"
          aria-label="Sugerencias del asistente"
          data-asistente-panel={resultado.tipo}
          className="absolute bottom-full left-2 right-2 z-30 mb-2 max-h-[min(420px,60dvh)] overflow-y-auto rounded-xl border border-border-strong bg-popover p-3 text-popover-foreground shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-brand" strokeWidth={1.8} aria-hidden />
              {resultado.tipo === "tecnica" ? "Técnica de venta" : resultado.titulo}
            </p>
            <button
              type="button"
              aria-label="Cerrar sugerencias"
              className="rounded p-1 text-text-3 hover:bg-secondary hover:text-foreground"
              onClick={() => {
                setResultado(null);
                onCerrar?.();
              }}
            >
              <X className="h-4 w-4" strokeWidth={1.7} />
            </button>
          </div>

          {resultado.tipo === "sugerencias" ? (
            <ul className="space-y-2">
              {resultado.sugerencias.map((s, i) => (
                <li key={i} className="rounded-lg border border-border bg-subtle p-2.5">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-text-3">
                    {s.enfoque}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{s.texto}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-warning-text">
                      {tieneMarcadores(s.texto) ? "Completa lo que está entre [corchetes]" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => usar(s.texto)}
                      className="rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand-text transition-colors hover:bg-brand-soft"
                    >
                      Usar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-base font-semibold text-foreground">{resultado.tecnica.nombre}</p>
              <p className="text-text-2">
                <span className="font-semibold">Momento: </span>
                {resultado.tecnica.momento}
              </p>
              <p className="text-text-2">
                <span className="font-semibold">Por qué: </span>
                {resultado.tecnica.porque}
              </p>
              <div className="rounded-lg border border-border bg-subtle p-2.5">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-text-3">Ejemplo</p>
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">{resultado.tecnica.ejemplo}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-warning-text">
                    {tieneMarcadores(resultado.tecnica.ejemplo) ? "Completa lo que está entre [corchetes]" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => usar(resultado.tecnica.ejemplo)}
                    className="rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand-text transition-colors hover:bg-brand-soft"
                  >
                    Usar ejemplo
                  </button>
                </div>
              </div>
            </div>
          )}
          <p className="mt-2 text-[11px] text-text-3">
            Sugerencias de IA: revísalas antes de enviar. Nada sale sin que pulses Enviar.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * f01 · fase 2 — Con la ventana de WhatsApp cerrada solo sale una plantilla:
 * el asistente lee la conversación y dice cuál conviene y por qué.
 */
export function RecomendarPlantilla({ conversationId }: { conversationId: string }) {
  const iaActiva = useIaActiva();
  const [trabajando, setTrabajando] = useState(false);
  const [respuesta, setRespuesta] = useState<{ nombre: string; porque: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!iaActiva) return null;

  async function recomendar() {
    setTrabajando(true);
    setError(null);
    const r = await pedir<{ tipo: "plantilla"; plantilla: { nombre: string; porque: string } }>(
      "/api/inbox/asistente/sugerencias",
      { conversationId, accion: "seguimiento" }
    );
    setTrabajando(false);
    if (!r.ok) setError(r.mensaje);
    else setRespuesta(r.data.plantilla);
  }

  return (
    <div className="mb-3" data-asistente-plantilla>
      {respuesta ? (
        <div className="flex items-start gap-2 rounded-md border border-brand-soft bg-brand-tint p-2.5 text-sm text-brand-text">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden />
          <p>
            <span className="font-semibold">Usa «{respuesta.nombre.replace(/_/g, " ")}».</span> {respuesta.porque}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void recomendar()}
          disabled={trabajando}
          className={cn(
            "flex items-center gap-1.5 rounded-full border border-border-strong bg-background px-3 py-1 text-xs font-semibold text-text-2 transition-colors hover:border-brand hover:bg-brand-tint hover:text-brand-text disabled:opacity-60",
            trabajando && "animate-pulse"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
          {trabajando ? "Leyendo la conversación…" : "¿Qué plantilla le mando?"}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
