/**
 * f01 · fase 3 — El catálogo de técnicas de venta del coach del asesor.
 *
 * Es cerrado a propósito: el modelo elige UNA clave de aquí y la salida se
 * valida contra la lista. Así la pantalla siempre sabe nombrarla y explicarla,
 * y una técnica que no conocemos (o una manipuladora) no llega al asesor.
 */

export const TECNICAS_VENTA = [
  {
    clave: "spin",
    nombre: "Preguntas SPIN",
    cuando: "Descubrimiento: aún no sabes bien qué necesita el cliente.",
    como: "Pregunta por su Situación, el Problema que tiene, la Implicación de no resolverlo y la Necesidad de una solución, antes de ofrecer.",
  },
  {
    clave: "sentir_sintieron_encontraron",
    nombre: "Sentir, sintieron, encontraron",
    cuando: "Objeción (precio, duda, desconfianza).",
    como: "Valida lo que siente, cuenta que otros clientes sintieron lo mismo y qué encontraron al decidirse. Sin discutirle.",
  },
  {
    clave: "valor_antes_que_precio",
    nombre: "Valor antes que precio",
    cuando: "El cliente pregunta el precio sin conocer todavía lo que recibe.",
    como: "Conecta lo que ofreces con lo que el cliente dijo que necesita, y luego da el precio (o el marcador para darlo).",
  },
  {
    clave: "cierre_alternativa",
    nombre: "Cierre por alternativa",
    cuando: "El cliente muestra interés y solo falta decidir.",
    como: "Ofrece dos opciones concretas que ya son un sí (¿martes o jueves?, ¿paquete A o B?) en vez de preguntar si quiere.",
  },
  {
    clave: "prueba_social",
    nombre: "Prueba social",
    cuando: "El cliente duda de si funciona o de si es para él.",
    como: "Menciona casos, reseñas o resultados de otros clientes, solo si están en el conocimiento del negocio.",
  },
  {
    clave: "urgencia_honesta",
    nombre: "Urgencia honesta",
    cuando: "Hay una razón REAL para decidir pronto (cupo, fecha, promoción vigente en el conocimiento).",
    como: "Explica el motivo real y la fecha. Nunca inventes escasez ni plazos.",
  },
  {
    clave: "venta_consultiva",
    nombre: "Venta consultiva",
    cuando: "Compra compleja o cliente indeciso entre opciones.",
    como: "Actúa como asesor: resume lo que entendiste, recomienda la opción que mejor encaja y explica por qué, aunque no sea la más cara.",
  },
  {
    clave: "seguimiento_con_valor",
    nombre: "Seguimiento con valor",
    cuando: "El cliente dejó de contestar.",
    como: "Retoma su último tema y aporta algo útil (un dato, una respuesta pendiente) con una sola pregunta fácil de contestar. Sin presionar.",
  },
] as const;

export type ClaveTecnica = (typeof TECNICAS_VENTA)[number]["clave"];

export const CLAVES_TECNICA = TECNICAS_VENTA.map((t) => t.clave) as [ClaveTecnica, ...ClaveTecnica[]];

export function tecnicaDe(clave: ClaveTecnica) {
  return TECNICAS_VENTA.find((t) => t.clave === clave)!;
}
