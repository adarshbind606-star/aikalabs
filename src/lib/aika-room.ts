export interface RoomOption { id: string; label: string; emoji: string }
export interface RoomCategory {
  key: keyof RoomConfig;
  label: string;
  emoji: string;
  options: RoomOption[];
}

export interface RoomConfig {
  desk: string;
  bed: string;
  pc: string;
  poster: string;
  plant: string;
  plushie: string;
  books: string;
  figure: string;
  lighting: string;
  background: string;
}

export const ROOM_CATEGORIES: RoomCategory[] = [
  { key: "desk", label: "Desk", emoji: "🪑", options: [
    { id: "none", label: "No desk", emoji: "—" },
    { id: "wood", label: "Wooden desk", emoji: "🪵" },
    { id: "study", label: "Study desk", emoji: "🗄️" },
    { id: "gaming", label: "Gaming desk", emoji: "🕹️" },
  ]},
  { key: "bed", label: "Bed", emoji: "🛏️", options: [
    { id: "none", label: "No bed", emoji: "—" },
    { id: "futon", label: "Futon", emoji: "🇯🇵" },
    { id: "bed", label: "Cozy bed", emoji: "🛏️" },
    { id: "canopy", label: "Canopy bed", emoji: "👑" },
  ]},
  { key: "pc", label: "PC", emoji: "🖥️", options: [
    { id: "none", label: "No PC", emoji: "—" },
    { id: "laptop", label: "Laptop", emoji: "💻" },
    { id: "desktop", label: "Desktop rig", emoji: "🖥️" },
    { id: "dual", label: "Dual monitors", emoji: "🖥️🖥️" },
  ]},
  { key: "poster", label: "Posters", emoji: "🖼️", options: [
    { id: "none", label: "Bare wall", emoji: "—" },
    { id: "anime", label: "Anime poster", emoji: "🖼️" },
    { id: "band", label: "Band poster", emoji: "🎸" },
    { id: "map", label: "Star map", emoji: "🌌" },
  ]},
  { key: "plant", label: "Plants", emoji: "🪴", options: [
    { id: "none", label: "No plants", emoji: "—" },
    { id: "pot", label: "Potted plant", emoji: "🪴" },
    { id: "bonsai", label: "Bonsai", emoji: "🌳" },
    { id: "sakura", label: "Sakura branch", emoji: "🌸" },
  ]},
  { key: "plushie", label: "Plushies", emoji: "🧸", options: [
    { id: "none", label: "None", emoji: "—" },
    { id: "bear", label: "Teddy bear", emoji: "🧸" },
    { id: "cat", label: "Cat plush", emoji: "🐱" },
    { id: "bunny", label: "Bunny plush", emoji: "🐰" },
  ]},
  { key: "books", label: "Books", emoji: "📚", options: [
    { id: "none", label: "No books", emoji: "—" },
    { id: "stack", label: "Book stack", emoji: "📚" },
    { id: "shelf", label: "Bookshelf", emoji: "🗂️" },
    { id: "manga", label: "Manga wall", emoji: "📕" },
  ]},
  { key: "figure", label: "Figures", emoji: "🎎", options: [
    { id: "none", label: "None", emoji: "—" },
    { id: "figure", label: "Anime figure", emoji: "🎎" },
    { id: "mecha", label: "Mecha model", emoji: "🤖" },
    { id: "dragon", label: "Dragon statue", emoji: "🐉" },
  ]},
  { key: "lighting", label: "Lighting", emoji: "💡", options: [
    { id: "warm", label: "Warm lamp", emoji: "🕯️" },
    { id: "neon", label: "Neon RGB", emoji: "🟣" },
    { id: "moon", label: "Moonlight", emoji: "🌙" },
    { id: "sunset", label: "Golden hour", emoji: "🌇" },
  ]},
  { key: "background", label: "Background", emoji: "🪟", options: [
    { id: "city", label: "City window", emoji: "🏙️" },
    { id: "sakura", label: "Sakura garden", emoji: "🌸" },
    { id: "rain", label: "Rainy night", emoji: "🌧️" },
    { id: "space", label: "Starfield", emoji: "🌠" },
  ]},
];

export const DEFAULT_ROOM: RoomConfig = {
  desk: "wood", bed: "bed", pc: "desktop", poster: "anime", plant: "pot",
  plushie: "bear", books: "stack", figure: "figure", lighting: "warm", background: "sakura",
};

export const ROOM_KEY = "aika-room";

export function loadRoom(): RoomConfig {
  if (typeof window === "undefined") return DEFAULT_ROOM;
  try {
    const raw = localStorage.getItem(ROOM_KEY);
    return raw ? { ...DEFAULT_ROOM, ...JSON.parse(raw) } : DEFAULT_ROOM;
  } catch {
    return DEFAULT_ROOM;
  }
}

export function saveRoom(cfg: RoomConfig) {
  localStorage.setItem(ROOM_KEY, JSON.stringify(cfg));
}
