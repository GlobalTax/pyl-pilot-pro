import { Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const Plantilla = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <div className="mx-auto mb-2 rounded-full bg-secondary/10 p-3 w-fit">
          <Download className="text-secondary" size={28} />
        </div>
        <CardTitle>Descargar Plantilla</CardTitle>
        <CardDescription>Descarga de plantilla Excel</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Funcionalidad próximamente disponible.</p>
      </CardContent>
    </Card>
  </div>
);

export default Plantilla;
