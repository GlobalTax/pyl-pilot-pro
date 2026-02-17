import { FileOutput } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const Convertir = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <div className="mx-auto mb-2 rounded-full bg-secondary/10 p-3 w-fit">
          <FileOutput className="text-secondary" size={28} />
        </div>
        <CardTitle>Convertir a PYL</CardTitle>
        <CardDescription>Conversión de P&L a formato .pyl</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Funcionalidad próximamente disponible.</p>
      </CardContent>
    </Card>
  </div>
);

export default Convertir;
