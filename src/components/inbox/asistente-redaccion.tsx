"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { atajoBandeja } from "@/lib/atajos";
import { hayDialogoAbierto } from "@/components/atajos-globales";

/**
 * f01 — Asistente de redacción del asesor: corrige, pule o cambia el tono del
 * borrador. Solo PROPONE: el texto nuevo reemplaza el borrador (el compositor
 * ofrece deshacer) y enviar sigue siendo del asesor.
 */

type Opcion = {
  clave: string;
  etiqueta: string;
  ayuda: string;
  cuerpo: { accion: "ortografia" | "pulir" | "tono"; tono?: "profesional" | "casual" | "calido" | "breve" };
};

const OPCIONES: Opcion[] = [
  { clave: "ortografia", etiqueta: "Corregir ortografía", ayuda: "Acentos, puntuación y gramática", cuerpo: { accion: "ortografia" } },
  { clave: "pulir", etiqueta: "Pulir redacción", ayuda: "Más claro, en el tono de tu marca", cuerpo: { accion: "pulir" } },
  { clave: "profesional", etiqueta: "Tono profesional", ayuda: "Formal y cortés", cuerpo: { accion: "tono", tono: "profesional" } },
  { clave: "casual", etiqueta: "Tono casual", ayuda: "Cercano y relajado", cuerpo: { accion: "tono", tono: "casual" } },
  { clave: "calido", etiqueta: "Tono cálido", ayuda: "Empático y amable", cuerpo: { accion: "tono", tono: "calido" } },
  { clave: "breve", etiqueta: "Más breve", ayuda: "Lo mismo en menos palabras", cuerpo: { accion: "tono", tono: "breve" } },
];

export function AsistenteRedaccion({
  texto,
  disabled,
  onAplicar,
  onError,
  onCerrar,
}: {
  texto: string;
  disabled: boolean;
  /** El borrador propuesto: reemplaza al actual. */
  onAplicar: (propuesta: string) => void;
  /** El error a mostrar bajo la caja, o `null` para limpiarlo. */
  onError: (mensaje: string | null) => void;
  /** Al cerrar el menú con Escape: el foco vuelve a la caja. */
  onCerrar?: () => void;
}) {
  const [iaActiva, setIaActiva] = useState(false);
  const [open, setOpen] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [activa, setActiva] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  // El texto de AHORA: si el asesor siguió escribiendo mientras la IA pensaba,
  // la propuesta llega tarde y no debe pisar lo nuevo.
  const textoActual = useRef(texto);
  useEffect(() => {
    textoActual.current = texto;
  }, [texto]);
  const id = useId();
  const sinTexto = !texto.trim();
  const visible = open && !disabled && !trabajando;

  // Sin IA activa no se dibuja: un botón que solo sabe fallar es peor que no
  // tenerlo. El compositor se monta con cada conversación, así que se pregunta
  // una vez por conversación.
  useEffect(() => {
    let vivo = true;
    fetch("/api/agent/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { aiConfigured?: boolean } | null) => {
        if (vivo) setIaActiva(Boolean(d?.aiConfigured));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // 055 — Alt+A abre el menú, también escribiendo en la caja.
  useEffect(() => {
    if (!iaActiva) return;
    const onKey = (e: KeyboardEvent) => {
      if (atajoBandeja(e) !== "asistente" || hayDialogoAbierto()) return;
      e.preventDefault();
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

  useEffect(() => {
    if (!visible) return;
    function fuera(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    // En el documento y no en el menú: con la caja vacía las opciones están
    // deshabilitadas y el foco no entra al menú, pero Escape igual lo cierra.
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      setOpen(false);
      onCerrar?.();
    }
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [visible, onCerrar]);

  async function aplicar(opcion: Opcion) {
    const borrador = texto;
    if (!borrador.trim() || trabajando) return;
    setOpen(false);
    setTrabajando(true);
    onError(null);
    try {
      const res = await fetch("/api/inbox/asistente", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...opcion.cuerpo, borrador }),
      });
      const data = (await res.json().catch(() => null)) as
        | { text?: string; error?: { message?: string } }
        | null;
      if (!res.ok || !data?.text) {
        onError(data?.error?.message ?? `Error ${res.status}. Tu texto quedó intacto.`);
        return;
      }
      if (textoActual.current !== borrador) {
        onError("Cambiaste el texto mientras tanto: vuelve a pedirlo.");
        return;
      }
      onAplicar(data.text);
    } catch {
      onError("No se pudo conectar con el servidor. Tu texto quedó intacto.");
    } finally {
      setTrabajando(false);
      onCerrar?.();
    }
  }

  if (!iaActiva) return null;

  return (
    <div ref={root} className="contents">
      <button
        type="button"
        disabled={disabled || trabajando}
        aria-label="Asistente de redacción"
        title="Asistente de redacción (Alt+A)"
        aria-haspopup="menu"
        aria-expanded={visible}
        aria-controls={visible ? id : undefined}
        aria-busy={trabajando}
        className={cn(
          "shrink-0 rounded p-1.5 text-text-3 transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40",
          visible && "bg-brand-tint text-brand-ink",
          trabajando && "animate-pulse text-brand"
        )}
        onClick={() => {
          setActiva(0);
          setOpen(!open);
        }}
      >
        <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </button>
      {visible && (
        <div
          id={id}
          role="menu"
          aria-label="Asistente de redacción"
          className="absolute bottom-full left-2 z-30 mb-2 w-[min(280px,calc(100%-1rem))] rounded-xl border border-border-strong bg-popover p-1.5 text-popover-foreground shadow-xl"
          onKeyDown={(e) => {
            const n = OPCIONES.length;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setActiva((i) => (i + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
            }
          }}
        >
          <p className="px-2.5 pb-1 pt-1.5 text-xs font-semibold text-text-3">
            {sinTexto ? "Escribe algo primero" : "Revisa la propuesta antes de enviar"}
          </p>
          {OPCIONES.map((o, i) => (
            <button
              key={o.clave}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              role="menuitem"
              data-accion={o.clave}
              disabled={sinTexto}
              tabIndex={i === activa ? 0 : -1}
              onClick={() => void aplicar(o)}
              onMouseEnter={() => setActiva(i)}
              className={cn(
                "flex w-full flex-col items-start rounded-md px-2.5 py-1.5 text-left outline-none transition-colors disabled:opacity-40",
                i === activa && !sinTexto && "bg-secondary"
              )}
            >
              <span className="text-sm font-medium text-foreground">{o.etiqueta}</span>
              <span className="text-xs text-text-3">{o.ayuda}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
