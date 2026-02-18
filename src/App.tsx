import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ActivityProvider } from "./contexts/ActivityContext";
import Index from "./pages/Index";
import Convertir from "./pages/Convertir";
import Visor from "./pages/Visor";
import Plantilla from "./pages/Plantilla";
import NotFound from "./pages/NotFound";
import Ayuda from "./pages/Ayuda";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ActivityProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/convertir" element={<Convertir />} />
              <Route path="/visor" element={<Visor />} />
              <Route path="/plantilla" element={<Plantilla />} />
              <Route path="/ayuda" element={<Ayuda />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ActivityProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
