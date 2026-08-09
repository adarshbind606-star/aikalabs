export interface AnimeTheme {
  id: string;
  name: string;
  emoji: string;
  dark: boolean;
  swatch: string[];
}

export const ANIME_THEMES: AnimeTheme[] = [
  { id: "sakura-night", name: "Sakura Night", emoji: "🌸", dark: true, swatch: ["#0a0a14", "#1b1730", "#f08fb4", "#f0cf8c"] },
  { id: "cyber-tokyo", name: "Cyber Tokyo", emoji: "🌌", dark: true, swatch: ["#0a0818", "#1a1240", "#ff2ea6", "#29e6ff"] },
  { id: "dreamy-sky", name: "Dreamy Sky", emoji: "☁️", dark: false, swatch: ["#eff8ff", "#cbe6fb", "#1a8fe3", "#f0a0c0"] },
  { id: "moonlit-shrine", name: "Moonlit Shrine", emoji: "🌙", dark: true, swatch: ["#0d1020", "#1a2038", "#f5d67b", "#9db8d9"] },
  { id: "neon-city", name: "Neon City", emoji: "⚡", dark: true, swatch: ["#0b0513", "#1e0f33", "#f13cff", "#00ffb2"] },
  { id: "anime-school", name: "Anime School", emoji: "🏫", dark: false, swatch: ["#faf5ec", "#eadfc9", "#eb6b3a", "#2f7ad1"] },
  { id: "traditional-japan", name: "Traditional Japan", emoji: "🏯", dark: false, swatch: ["#f5f0e8", "#e3d6c4", "#bc2b2b", "#6a5949"] },
  { id: "dark-fantasy", name: "Dark Fantasy", emoji: "🖤", dark: true, swatch: ["#0d0a12", "#1d1728", "#d93b57", "#d2a04a"] },
  { id: "magical-girl", name: "Magical Girl", emoji: "💜", dark: true, swatch: ["#130a1c", "#2a1540", "#f77de0", "#7ce8f5"] },
  { id: "futuristic-android", name: "Futuristic Android", emoji: "🤖", dark: true, swatch: ["#0e1114", "#1a2126", "#1fe0ff", "#b3bfcc"] },
];

export type AmbientId =
  | "petals" | "particles" | "fireflies" | "rain" | "clouds"
  | "snow" | "stars" | "city" | "shooting-stars" | "none";

export const AMBIENT_BACKGROUNDS: { id: AmbientId; name: string; emoji: string }[] = [
  { id: "petals", name: "Falling Sakura Petals", emoji: "🌸" },
  { id: "particles", name: "Floating Particles", emoji: "✨" },
  { id: "fireflies", name: "Fireflies", emoji: "🪰" },
  { id: "rain", name: "Rain", emoji: "🌧️" },
  { id: "clouds", name: "Clouds", emoji: "☁️" },
  { id: "snow", name: "Snow", emoji: "❄️" },
  { id: "stars", name: "Stars", emoji: "⭐" },
  { id: "city", name: "City Lights", emoji: "🏙️" },
  { id: "shooting-stars", name: "Shooting Stars", emoji: "💫" },
  { id: "none", name: "None", emoji: "🚫" },
];

export const THEME_KEY = "aika-anime-theme";
export const AMBIENT_KEY = "aika-ambient-bg";
export const DEFAULT_THEME = "sakura-night";
export const DEFAULT_AMBIENT: AmbientId = "petals";
