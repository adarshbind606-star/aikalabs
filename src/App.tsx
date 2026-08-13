import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { AnimeThemeProvider } from "@/hooks/useAnimeTheme";
import Chat from "./pages/Chat";
import ImageGen from "./pages/ImageGen";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import Unbound from "./pages/Unbound";
import Comet from "./pages/Comet";
import Kimono from "./pages/Kimono";
import AikaRoom from "./pages/AikaRoom";

const queryClient = new QueryClient();

const App = () => (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <AnimeThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/image-gen" element={<ImageGen />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/unbound" element={<Unbound />} />
              <Route path="/comet" element={<Comet />} />
              <Route path="/kimono" element={<Kimono />} />
              <Route path="/room" element={<AikaRoom />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
      </AnimeThemeProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
