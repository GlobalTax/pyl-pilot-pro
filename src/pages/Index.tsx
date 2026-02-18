import { Link } from "react-router-dom";
import { FileUp, Eye, Download, HelpCircle, Clock, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { PYL_LINE_MAP } from "@/lib/pyl";
import { useActivity } from "@/contexts/ActivityContext";

const quickLinks = [
  { to: "/convertir", icon: FileUp, title: "Convertir a PYL", desc: "Excel/PDF → .pyl" },
  { to: "/visor", icon: Eye, title: "Visor P&L", desc: "Visualizar archivos .pyl" },
  { to: "/plantilla", icon: Download, title: "Descargar Plantilla", desc: "Plantilla Excel P&L" },
  { to: "/ayuda", icon: HelpCircle, title: "Ayuda", desc: "Guía de uso" },
];

const Index = () => {
  const { activity } = useActivity();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-medium tracking-tight">Bienvenido a PYL Manager</h1>
        <p className="text-muted-foreground mt-1">Herramienta de gestión de P&amp;L para franquicias</p>
      </div>

      {/* Quick access grid */}
      <div className="grid grid-cols-2 gap-4">
        {quickLinks.map((l) => (
          <Link key={l.to} to={l.to} className="group">
            <Card className="h-full hover:shadow-md hover:-translate-y-0.5 transition-all">
              <CardHeader className="flex flex-row items-center gap-3 p-4">
                <div className="rounded-md bg-primary/10 p-2">
                  <l.icon className="text-primary" size={22} />
                </div>
                <div>
                  <CardTitle className="text-base">{l.title}</CardTitle>
                  <CardDescription className="text-xs">{l.desc}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-muted-foreground" />
            <CardTitle className="text-lg">Actividad reciente</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay actividad reciente en esta sesión.</p>
          ) : (
            <ul className="divide-y">
              {activity.map((a, i) => (
                <li key={i} className="py-2 flex justify-between text-sm">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground">{a.localCode} · {a.date}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Info section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Info size={18} className="text-muted-foreground" />
            <CardTitle className="text-lg">¿Qué es un archivo .pyl?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Un archivo <strong>.pyl</strong> es un formato de texto plano que contiene las 43 líneas del P&amp;L (Profit &amp; Loss) de un restaurante,
            con datos de año, mes, código de local e importe por línea.
          </p>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="link" className="px-0 h-auto text-sm">Ver mapeo completo →</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Mapeo de líneas PYL</DialogTitle>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Línea</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="w-20">Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PYL_LINE_MAP.map((l) => (
                    <TableRow key={l.lineNumber}>
                      <TableCell className="font-mono">{String(l.lineNumber).padStart(2, "0")}</TableCell>
                      <TableCell>{l.label}</TableCell>
                      <TableCell>
                        <span className={l.type === "total" ? "font-medium text-primary" : "text-muted-foreground"}>
                          {l.type}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
