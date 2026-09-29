import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

// La versión sale de package.json y no de una constante aparte: duplicarla es
// tenerla desactualizada en uno de los dos lados, y justo esta no puede mentir.
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
) as { version: string };

const nextConfig: NextConfig = {
  // standalone es para la imagen Docker (Linux). En Windows el trazado crea
  // symlinks que requieren permisos elevados, así que ahí se omite.
  output: process.platform === "win32" ? undefined : "standalone",
  // El paquete `postgres` usa APIs de Node que no deben empaquetarse en el bundle.
  serverExternalPackages: ["postgres"],
  // Se congelan al construir: lo que queda aquí va dentro del binario y no
  // cambia en tiempo de ejecución. El commit solo se congela si `SOURCE_COMMIT`
  // llega AL BUILD (build arg `SOURCE_COMMIT`; con docker compose,
  // `--build-arg`). Si no llega, esto queda vacío y el servidor cae al
  // `SOURCE_COMMIT` del entorno al arrancar, marcado como NO verificado
  // (`src/lib/version.ts`, #50): puede no ser el del código que corre.
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_BUILD_COMMIT: process.env.SOURCE_COMMIT ?? "",
  },
  /**
   * Cabeceras de seguridad para TODA respuesta.
   *
   * Van aquí y no en etiquetas del proxy a propósito: Coolify regenera las
   * suyas en cada despliegue —se perderían— y en la Ruta B quien sirve es
   * Caddy, que no las lleva. En el código valen para las dos rutas y viajan
   * con el repositorio.
   *
   * No se incluye `Content-Security-Policy`: Next inyecta scripts y estilos
   * en línea, así que una CSP útil necesita nonces por petición y una ronda
   * de pruebas propia. Media CSP rompe la app sin protegerla; es una feature
   * aparte, no un añadido a ésta.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // El panel no se embebe en ningún sitio: sin esto, cualquier página
          // puede meterlo en un iframe invisible y robar clics del operador.
          { key: "X-Frame-Options", value: "DENY" },
          // Un adjunto subido no puede hacerse pasar por HTML al servirse.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // La URL del CRM lleva ids de conversación; no salen hacia fuera.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Un año. Sin `preload` ni `includeSubDomains`: esto lo decide quien
          // opera el dominio, no la app, y aquí conviven otros subdominios.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
          // La app no usa cámara, micrófono ni geolocalización del navegador
          // (la ubicación de WhatsApp se teclea o se pega de un enlace).
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
