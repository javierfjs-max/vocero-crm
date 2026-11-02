/**
 * 041 — Catálogo local del selector de emojis: caracteres Unicode que dibuja
 * el sistema del operador, con nombres en español. Sin imágenes ni peticiones
 * a ningún sitio. La búsqueda y la inserción viven aquí para probarlas sin DOM.
 */
export const EMOJI_CATEGORIES = [
  { id: "faces", label: "Caras", icon: "😀" },
  { id: "gestures", label: "Gestos", icon: "👋" },
  { id: "hearts", label: "Corazones", icon: "❤️" },
  { id: "party", label: "Celebración", icon: "🎉" },
  { id: "nature", label: "Naturaleza", icon: "🌸" },
  { id: "food", label: "Comida", icon: "🍕" },
  { id: "objects", label: "Objetos", icon: "💡" },
] as const;

export type EmojiCategory = (typeof EMOJI_CATEGORIES)[number]["id"];
export type Emoji = { value: string; label: string; category: EmojiCategory };

const groups: Record<EmojiCategory, readonly (readonly [string, string])[]> = {
  faces: [
    ["😀", "Sonrisa"], ["😃", "Sonrisa alegre"], ["😄", "Risa"], ["😁", "Sonrisa radiante"],
    ["😆", "Risa con ojos cerrados"], ["😅", "Sonrisa con sudor"], ["😂", "Risa con lágrimas"],
    ["🤣", "Carcajada"], ["😊", "Sonrojo feliz"], ["😉", "Guiño"], ["😍", "Enamorado"],
    ["🥰", "Cariño"], ["😘", "Beso"], ["😗", "Mandar un beso"], ["😋", "Sabroso"],
    ["😛", "Sacar la lengua"], ["😜", "Guiño con lengua"], ["🤪", "Locura"],
    ["😎", "Gafas de sol"], ["🤩", "Estrellas en los ojos"], ["🥳", "Cara de fiesta"],
    ["🙂", "Sonrisa leve"], ["🙃", "Cara al revés"], ["🤗", "Abrazo"], ["🤭", "Risita"],
    ["🤔", "Pensando"], ["🤫", "Silencio"], ["😐", "Cara neutral"], ["😑", "Sin expresión"],
    ["🙄", "Ojos en blanco"], ["😏", "Sonrisa pícara"], ["😌", "Alivio"], ["😴", "Dormido"],
    ["🥱", "Bostezo"], ["😔", "Triste"], ["😢", "Llorando"], ["😭", "Llanto"],
    ["🥺", "Por favor"], ["😮", "Sorpresa"], ["😱", "Asombro"], ["😬", "Mueca"],
    ["😳", "Vergüenza"], ["😤", "Enfado"], ["😡", "Enojado"], ["🤯", "Increíble"],
    ["🤒", "Enfermo"], ["🤕", "Herido"], ["🤢", "Náuseas"], ["🤧", "Estornudo"],
    ["😇", "Ángel"], ["🤠", "Vaquero"], ["🤡", "Payaso"], ["👻", "Fantasma"],
    ["🤖", "Robot"], ["💩", "Popó"], ["😺", "Gato sonriente"], ["😻", "Gato enamorado"],
  ],
  gestures: [
    ["👋", "Saludo"], ["🤚", "Mano levantada"], ["✋", "Alto"], ["🖐️", "Mano abierta"],
    ["👌", "OK"], ["🤌", "Dedos juntos"], ["✌️", "Paz"], ["🤞", "Dedos cruzados"],
    ["🤟", "Te quiero"], ["🤘", "Rock"], ["🤙", "Llámame"], ["👈", "Señalar izquierda"],
    ["👉", "Señalar derecha"], ["👆", "Señalar arriba"], ["👇", "Señalar abajo"],
    ["☝️", "Atención"], ["👍", "Pulgar arriba"], ["👎", "Pulgar abajo"], ["✊", "Puño"],
    ["👊", "Chocar puños"], ["👏", "Aplausos"], ["🙌", "Manos celebrando"],
    ["👐", "Manos abiertas"], ["🤲", "Manos juntas"], ["🤝", "Acuerdo"],
    ["🙏", "Gracias"], ["💪", "Fuerza"], ["✍️", "Escribir"], ["👀", "Ojos"], ["🫶", "Manos de corazón"],
  ],
  hearts: [
    ["❤️", "Corazón rojo"], ["🧡", "Corazón naranja"], ["💛", "Corazón amarillo"],
    ["💚", "Corazón verde"], ["💙", "Corazón azul"], ["💜", "Corazón morado"],
    ["🖤", "Corazón negro"], ["🤍", "Corazón blanco"], ["🤎", "Corazón café"],
    ["💖", "Corazón brillante"], ["💕", "Dos corazones"], ["💗", "Corazón creciendo"],
    ["💓", "Corazón latiendo"], ["💞", "Corazones girando"], ["💘", "Corazón con flecha"],
    ["💝", "Corazón con lazo"], ["💔", "Corazón roto"], ["❤️‍🔥", "Corazón en llamas"],
    ["❤️‍🩹", "Corazón sanando"], ["💌", "Carta de amor"], ["💋", "Marca de beso"], ["💯", "Cien puntos"],
  ],
  party: [
    ["🎉", "Fiesta confeti"], ["🎊", "Confeti"], ["🎈", "Globo"], ["🎁", "Regalo"],
    ["🎀", "Lazo"], ["🎂", "Pastel de cumpleaños"], ["🧁", "Cupcake"], ["🕯️", "Vela"],
    ["✨", "Destellos"], ["🌟", "Estrella brillante"], ["⭐", "Estrella"], ["💫", "Brillo"],
    ["🎆", "Fuegos artificiales"], ["🎇", "Bengala"], ["🪅", "Piñata"], ["🪩", "Bola disco"],
    ["🥂", "Brindis"], ["🍾", "Champaña"], ["🎵", "Nota musical"], ["🎶", "Música"],
    ["🎤", "Micrófono"], ["💃", "Bailarina"], ["🕺", "Bailarín"], ["👑", "Corona"],
    ["🏆", "Trofeo"], ["🏅", "Medalla"], ["🎓", "Graduación"], ["💍", "Anillo"],
  ],
  nature: [
    ["🌸", "Flor de cerezo"], ["🌷", "Tulipán"], ["🌹", "Rosa"], ["🌻", "Girasol"],
    ["💐", "Ramo de flores"], ["🌺", "Flor de hibisco"], ["🌼", "Margarita"], ["🌿", "Hierba"],
    ["🍀", "Trébol"], ["🌵", "Cactus"], ["🌴", "Palmera"], ["🌳", "Árbol"],
    ["☀️", "Sol"], ["🌈", "Arcoíris"], ["☁️", "Nube"], ["🌧️", "Lluvia"],
    ["❄️", "Nieve"], ["🔥", "Fuego"], ["💧", "Gota de agua"], ["🌙", "Luna"],
    ["🌎", "Mundo"], ["🐶", "Perro"], ["🐱", "Gato"], ["🐰", "Conejo"],
    ["🐻", "Oso"], ["🦄", "Unicornio"], ["🦋", "Mariposa"], ["🐝", "Abeja"],
    ["🐥", "Pollito"], ["🐢", "Tortuga"], ["🐬", "Delfín"], ["🦖", "Dinosaurio"],
  ],
  food: [
    ["🍎", "Manzana"], ["🍊", "Naranja"], ["🍋", "Limón"], ["🍌", "Plátano"],
    ["🍉", "Sandía"], ["🍇", "Uvas"], ["🍓", "Fresa"], ["🍒", "Cereza"],
    ["🍍", "Piña"], ["🥑", "Aguacate"], ["🌽", "Elote"], ["🌮", "Taco"],
    ["🌯", "Burrito"], ["🍕", "Pizza"], ["🍔", "Hamburguesa"], ["🍟", "Papas fritas"],
    ["🌭", "Hot dog"], ["🍿", "Palomitas"], ["🍩", "Dona"], ["🍪", "Galleta"],
    ["🍫", "Chocolate"], ["🍬", "Dulce"], ["🍭", "Paleta"], ["🍦", "Helado"],
    ["☕", "Café"], ["🫖", "Té"], ["🧃", "Jugo"], ["🥤", "Refresco"],
  ],
  objects: [
    ["✅", "Confirmado"], ["✔️", "Correcto"], ["❌", "Cancelar"], ["❗", "Importante"],
    ["❓", "Pregunta"], ["⚠️", "Aviso"], ["🔔", "Campana"], ["📌", "Chincheta"],
    ["📍", "Ubicación"], ["📅", "Calendario"], ["⏰", "Alarma"], ["⌛", "Espera"],
    ["📦", "Paquete"], ["🛍️", "Compras"], ["🛒", "Carrito"], ["🚚", "Camión de entrega"],
    ["🚗", "Auto"], ["🏠", "Casa"], ["🏪", "Tienda"], ["💡", "Idea"],
    ["📱", "Celular"], ["☎️", "Teléfono"], ["💻", "Computadora"], ["📷", "Cámara"],
    ["📝", "Nota"], ["📚", "Libros"], ["✉️", "Sobre"], ["🔑", "Llave"],
    ["🔒", "Candado"], ["🔗", "Enlace"], ["🔧", "Llave inglesa"], ["🔨", "Martillo"],
    ["⚽", "Fútbol"], ["🏀", "Baloncesto"],
  ],
};

export const EMOJIS: readonly Emoji[] = EMOJI_CATEGORIES.flatMap(({ id }) =>
  groups[id].map(([value, label]) => ({ value, label, category: id }))
);

/** Minúsculas y sin acentos: «corazon» encuentra «Corazón». */
export function emojiSearchText(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es");
}

/**
 * Lo que enseña el selector: con búsqueda, en todo el catálogo (la búsqueda
 * manda sobre la categoría); sin ella, la categoría elegida o todo.
 */
export function filterEmojis(search: string, category: EmojiCategory | "all"): readonly Emoji[] {
  const query = emojiSearchText(search.trim());
  if (query) {
    return EMOJIS.filter(
      (emoji) => emojiSearchText(emoji.label).includes(query) || emoji.value === search.trim()
    );
  }
  return category === "all" ? EMOJIS : EMOJIS.filter((emoji) => emoji.category === category);
}

/**
 * Inserta en el cursor o reemplaza la selección, y dice dónde queda el cursor:
 * justo detrás del emoji, en unidades UTF-16 (lo que usa `setSelectionRange`).
 */
export function insertAtSelection(
  text: string,
  start: number,
  end: number,
  emoji: string
): { text: string; caret: number } {
  const from = Math.max(0, Math.min(start, end, text.length));
  const to = Math.max(from, Math.min(Math.max(start, end), text.length));
  return { text: text.slice(0, from) + emoji + text.slice(to), caret: from + emoji.length };
}
