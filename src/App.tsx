import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ActivityProvider } from "./contexts/ActivityContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Convertir from "./pages/Convertir";
import Visor from "./pages/Visor";
import Plantilla from "./pages/Plantilla";
import Restaurants from "./pages/Restaurants";
import NotFound from "./pages/NotFound";
import Ayuda from "./pages/Ayuda";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Pending from "./pages/Pending";
import Rejected from "./pages/Rejected";
import Admin from "./pages/Admin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ActivityProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/pending" element={<Pending />} />
              <Route path="/rejected" element={<Rejected />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/restaurants" element={<Restaurants />} />
                  <Route path="/convertir" element={<Convertir />} />
                  <Route path="/visor" element={<Visor />} />
                  <Route path="/plantilla" element={<Plantilla />} />
                  <Route path="/ayuda" element={<Ayuda />} />

                  {/* Admin routes */}
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<Admin />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </ActivityProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
