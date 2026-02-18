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
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";
import { HelpCircle } from "lucide-react";

const Ayuda = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <div className="mx-auto mb-2 rounded-full bg-secondary/10 p-3 w-fit">
          <HelpCircle className="text-secondary" size={28} />
        </div>
        <CardTitle>Ayuda</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Funcionalidad próximamente disponible.</p>
      </CardContent>
    </Card>
  </div>
);

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
