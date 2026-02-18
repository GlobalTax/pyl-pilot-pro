import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, LogOut } from "lucide-react";

const Rejected = () => {
  const { user, signOut } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 rounded-full bg-destructive/10 p-3 w-fit">
            <XCircle className="text-destructive" size={28} />
          </div>
          <CardTitle className="text-lg">Cuenta no aprobada</CardTitle>
          <CardDescription>
            Tu solicitud de acceso no ha sido aprobada. Si crees que es un error, contacta con tu asesor de NRRO.
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

export default Rejected;
