import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";

const Pending = () => {
  const { user, profile, signOut } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (profile?.status === "approved") return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 rounded-full bg-warning/10 p-3 w-fit">
            <Clock className="text-warning" size={28} />
          </div>
          <CardTitle className="text-lg">Tu cuenta está pendiente de aprobación</CardTitle>
          <CardDescription>
            El equipo de NRRO revisará tu solicitud. Si tienes dudas, contacta con tu asesor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={signOut} className="w-full gap-2">
            <LogOut size={16} />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pending;
