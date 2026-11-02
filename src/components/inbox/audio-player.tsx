"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 044 — Reproductor de audio como el de WhatsApp: reproducir/pausar, la onda
 * del audio (sacada del archivo), tocar o arrastrar sobre la onda para ir a un
 * momento, y velocidad 1× · 1.5× · 2×.
 *
 * El archivo se descarga entero (las notas de voz pesan poco): de ahí sale la
 * onda y, como el `<audio>` lee de memoria, ir a cualquier punto funciona sin
 * que el servidor sirva rangos.
 */

const BARRAS = 40;
const VELOCIDADES = [1, 1.5, 2] as const;
type Velocidad = (typeof VELOCIDADES)[number];
const CLAVE_VELOCIDAD = "vocero.audio.velocidad";

type Analisis = { barras: number[]; duracion: number | null };

/** Lo ya analizado, por URL: volver a la conversación no vuelve a decodificar. */
const analizados = new Map<string, Analisis>();
/** Solo suena un audio a la vez, como en WhatsApp. */
let sonando: HTMLAudioElement | null = null;

function velocidadGuardada(): Velocidad {
  try {
    const v = Number(window.localStorage.getItem(CLAVE_VELOCIDAD));
    return (VELOCIDADES as readonly number[]).includes(v) ? (v as Velocidad) : 1;
  } catch {
    return 1;
  }
}

function guardarVelocidad(v: Velocidad) {
  try {
    window.localStorage.setItem(CLAVE_VELOCIDAD, String(v));
  } catch {}
}

/** Onda de reserva (si el navegador no decodifica): estable para cada audio. */
function ondaDeReserva(semilla: string): number[] {
  let h = 2166136261;
  for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Array.from({ length: BARRAS }, () => {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return 0.25 + ((h >>> 0) % 1000) / 1600;
  });
}

async function analizar(datos: ArrayBuffer): Promise<Analisis | null> {
  const Ctx =
    typeof window !== "undefined"
      ? (window.OfflineAudioContext ??
        (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
          .webkitOfflineAudioContext)
      : undefined;
  if (!Ctx) return null;
  try {
    const ctx = new Ctx(1, 1, 48000);
    const buf = await ctx.decodeAudioData(datos);
    const canal = buf.getChannelData(0);
    const porBarra = Math.max(1, Math.floor(canal.length / BARRAS));
    const picos: number[] = [];
    for (let b = 0; b < BARRAS; b++) {
      let pico = 0;
      const fin = Math.min(canal.length, (b + 1) * porBarra);
      for (let i = b * porBarra; i < fin; i++) {
        const v = Math.abs(canal[i]!);
        if (v > pico) pico = v;
      }
      picos.push(pico);
    }
    const max = Math.max(...picos, 1e-6);
    return {
      barras: picos.map((p) => Math.max(0.12, Math.sqrt(p / max))),
      duracion: buf.duration,
    };
  } catch {
    return null;
  }
}

/**
 * `m:ss`. La posición se trunca (como un reloj); la duración total se
 * redondea: una nota de 2.99 s es «0:03», no «0:02».
 */
export function formatoTiempo(segundos: number, total = false): string {
  if (!Number.isFinite(segundos) || segundos < 0) return "0:00";
  const s = total ? Math.round(segundos) : Math.floor(segundos);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function AudioPlayer({ src, className }: { src: string; className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ondaRef = useRef<HTMLDivElement>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const urlLocal = useRef<string | null>(null);
  const cargando = useRef<Promise<HTMLAudioElement | null> | null>(null);
  const arrastrando = useRef(false);

  const [estado, setEstado] = useState<"idle" | "cargando" | "listo" | "error">("idle");
  const [analisis, setAnalisis] = useState<Analisis | null>(() => analizados.get(src) ?? null);
  const [duracion, setDuracionEstado] = useState<number | null>(analisis?.duracion ?? null);
  // Los manejadores que esperan la descarga leen la duración de aquí, no del
  // estado con el que se crearon.
  const duracionRef = useRef<number | null>(duracion);
  const setDuracion = useCallback((d: number | null) => {
    duracionRef.current = d;
    setDuracionEstado(d);
  }, []);
  const [actual, setActual] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [velocidad, setVelocidad] = useState<Velocidad>(1);

  useEffect(() => setVelocidad(velocidadGuardada()), []);

  /** Descarga, analiza y deja listo el `<audio>`. Una sola vez. */
  const cargar = useCallback((): Promise<HTMLAudioElement | null> => {
    if (cargando.current) return cargando.current;
    setEstado("cargando");
    cargando.current = (async () => {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        urlLocal.current = url;
        const audio = new Audio(url);
        audio.preload = "auto";
        audioRef.current = audio;
        let a = analizados.get(src) ?? null;
        if (!a) {
          a = (await analizar(await blob.arrayBuffer())) ?? {
            barras: ondaDeReserva(src),
            duracion: null,
          };
          analizados.set(src, a);
        }
        setAnalisis(a);
        if (a.duracion) setDuracion(a.duracion);
        audio.addEventListener("loadedmetadata", () => {
          if (Number.isFinite(audio.duration) && duracionRef.current === null) {
            setDuracion(audio.duration);
          }
        });
        audio.addEventListener("play", () => setReproduciendo(true));
        audio.addEventListener("pause", () => setReproduciendo(false));
        audio.addEventListener("ended", () => {
          setReproduciendo(false);
          audio.currentTime = 0;
          setActual(0);
        });
        setEstado("listo");
        return audio;
      } catch {
        setEstado("error");
        cargando.current = null;
        return null;
      }
    })();
    return cargando.current;
  }, [src, setDuracion]);

  // Se carga al acercarse a la vista: un hilo con muchos audios no los baja todos.
  useEffect(() => {
    const el = raiz.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      void cargar();
      return;
    }
    const io = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          io.disconnect();
          void cargar();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cargar]);

  useEffect(
    () => () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        if (sonando === audio) sonando = null;
      }
      if (urlLocal.current) URL.revokeObjectURL(urlLocal.current);
    },
    []
  );

  // El avance se pinta por cuadro mientras suena (`timeupdate` va a saltos).
  useEffect(() => {
    if (!reproduciendo) return;
    let id = 0;
    const paso = () => {
      const audio = audioRef.current;
      if (audio && !arrastrando.current) setActual(audio.currentTime);
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [reproduciendo]);

  async function alternar() {
    const audio = audioRef.current ?? (await cargar());
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (sonando && sonando !== audio) sonando.pause();
    sonando = audio;
    audio.playbackRate = velocidad;
    setTocado(true);
    try {
      await audio.play();
    } catch {
      setReproduciendo(false);
    }
  }

  function irA(segundo: number) {
    const total = duracionRef.current ?? 0;
    const t = Math.min(Math.max(segundo, 0), total);
    setActual(t);
    setTocado(true);
    const audio = audioRef.current;
    if (audio) audio.currentTime = t;
  }

  function fraccionDe(e: PointerEvent<HTMLDivElement>): number {
    const r = ondaRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return 0;
    return Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
  }

  async function alPresionar(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastrando.current = true;
    const f = fraccionDe(e);
    if (!audioRef.current) await cargar();
    irA(f * (duracionRef.current ?? 0));
  }

  function alMover(e: PointerEvent<HTMLDivElement>) {
    const total = duracionRef.current;
    if (!arrastrando.current || total === null) return;
    setActual(fraccionDe(e) * total);
  }

  function alSoltar(e: PointerEvent<HTMLDivElement>) {
    if (!arrastrando.current) return;
    arrastrando.current = false;
    irA(fraccionDe(e) * (duracionRef.current ?? 0));
  }

  function cambiarVelocidad() {
    const i = VELOCIDADES.indexOf(velocidad);
    const v = VELOCIDADES[(i + 1) % VELOCIDADES.length]!;
    setVelocidad(v);
    guardarVelocidad(v);
    if (audioRef.current) audioRef.current.playbackRate = v;
  }

  const barras = analisis?.barras ?? ondaDeReserva(src);
  const progreso = duracion ? Math.min(actual / duracion, 1) : 0;
  const etiquetaTiempo =
    tocado || reproduciendo ? formatoTiempo(actual) : formatoTiempo(duracion ?? 0, true);

  if (estado === "error") {
    return (
      <span className="text-[12.5px] text-text-3">
        No se pudo cargar el audio.{" "}
        <a href={src} className="text-brand-ink underline-offset-2 hover:underline" download>
          Descargarlo
        </a>
      </span>
    );
  }

  return (
    <div
      ref={raiz}
      data-audio-player
      data-playing={reproduciendo ? "true" : "false"}
      className={cn("flex w-[260px] max-w-full items-center gap-2.5 py-0.5", className)}
    >
      <button
        type="button"
        onClick={() => void alternar()}
        aria-label={reproduciendo ? "Pausar audio" : "Reproducir audio"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-brand-fg shadow-sm transition-colors hover:bg-brand-hover"
      >
        {estado === "cargando" && !analisis ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        ) : reproduciendo ? (
          <Pause className="h-4 w-4" fill="currentColor" strokeWidth={0} />
        ) : (
          <Play className="ml-0.5 h-4 w-4" fill="currentColor" strokeWidth={0} />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div
          ref={ondaRef}
          role="slider"
          tabIndex={0}
          aria-label="Posición del audio"
          aria-valuemin={0}
          aria-valuemax={Math.round(duracion ?? 0)}
          aria-valuenow={Math.round(actual)}
          aria-valuetext={`${formatoTiempo(actual)} de ${formatoTiempo(duracion ?? 0, true)}`}
          onPointerDown={(e) => void alPresionar(e)}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={() => (arrastrando.current = false)}
          onKeyDown={(e) => {
            if (duracion === null) return;
            const salto = { ArrowRight: 5, ArrowLeft: -5 }[e.key];
            if (salto !== undefined) {
              e.preventDefault();
              irA(actual + salto);
            } else if (e.key === "Home" || e.key === "End") {
              e.preventDefault();
              irA(e.key === "Home" ? 0 : duracion);
            }
          }}
          className="relative flex h-7 cursor-pointer touch-none select-none items-center gap-px rounded outline-none focus-visible:ring-2 focus-visible:ring-brand-soft"
        >
          {barras.map((h, i) => (
            <span
              key={i}
              className={cn(
                // Sin ancho mínimo: en una burbuja angosta las barras se
                // adelgazan en vez de meterse debajo del botón de velocidad.
                "min-w-0 flex-1 rounded-full transition-colors",
                (i + 0.5) / barras.length <= progreso ? "bg-brand" : "bg-text-4"
              )}
              style={{ height: `${Math.round(h * 100)}%` }}
            />
          ))}
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-brand shadow-sm"
            style={{ left: `${progreso * 100}%` }}
          />
        </div>
        <span className="mt-0.5 block font-mono text-[10.5px] tracking-[0.04em] text-text-3">
          {etiquetaTiempo}
        </span>
      </div>
      <button
        type="button"
        onClick={cambiarVelocidad}
        aria-label={`Velocidad ${velocidad}×. Cambiar velocidad`}
        title="Velocidad de reproducción"
        className="w-[42px] shrink-0 rounded-full border border-border-strong bg-background px-1.5 py-0.5 text-center text-[11.5px] font-semibold tabular-nums text-text-2 transition-colors hover:border-brand hover:text-brand-ink"
      >
        {velocidad}×
      </button>
    </div>
  );
}
