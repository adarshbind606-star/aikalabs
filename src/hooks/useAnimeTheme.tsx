import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  ANIME_THEMES, AMBIENT_KEY, THEME_KEY, DEFAULT_AMBIENT, DEFAULT_THEME, AmbientId,
} from "@/lib/anime-themes";

interface Ctx {
  themeId: string;
  ambient: AmbientId;
  setThemeId: (id: string) => void;
  setAmbient: (id: AmbientId) => void;
}

const AnimeThemeContext = createContext<Ctx>({
  themeId: DEFAULT_THEME,
  ambient: DEFAULT_AMBIENT,
  setThemeId: () => {},
  setAmbient: () => {},
});

export function AnimeThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(DEFAULT_THEME);
  const [ambient, setAmbientState] = useState<AmbientId>(DEFAULT_AMBIENT);

  useEffect(() => {
    const t = localStorage.getItem(THEME_KEY);
    const a = localStorage.getItem(AMBIENT_KEY) as AmbientId | null;
    if (t && ANIME_THEMES.some((x) => x.id === t)) setThemeIdState(t);
    if (a) setAmbientState(a);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("anime-theme");
    ANIME_THEMES.forEach((t) => root.classList.remove(`theme-${t.id}`));
    root.classList.add(`theme-${themeId}`);
    const meta = ANIME_THEMES.find((t) => t.id === themeId);
    root.classList.toggle("dark", !!meta?.dark);
  }, [themeId]);

  const setThemeId = (id: string) => {
    setThemeIdState(id);
    localStorage.setItem(THEME_KEY, id);
  };
  const setAmbient = (id: AmbientId) => {
    setAmbientState(id);
    localStorage.setItem(AMBIENT_KEY, id);
  };

  return (
    <AnimeThemeContext.Provider value={{ themeId, ambient, setThemeId, setAmbient }}>
      {children}
    </AnimeThemeContext.Provider>
  );
}

export const useAnimeTheme = () => useContext(AnimeThemeContext);
