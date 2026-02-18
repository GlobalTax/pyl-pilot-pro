import { Link, useNavigate } from "react-router-dom";
import { FileUp, Eye, Download, HelpCircle, Clock, Info, FileSpreadsheet, Sparkles, PenLine } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PYL_LINE_MAP } from "@/lib/pyl";
import { usePylHistory } from "@/hooks/usePylHistory";
import { useUserRestaurants } from "@/hooks/useUserRestaurants";
import { useMemo } from "react";

const quickLinks = [
  { to: "/convertir", icon: FileUp, title: "Convertir a PYL", desc: "Excel/PDF → .pyl" },
  { to: "/visor", icon: Eye, title: "Visor P&L", desc: "Visualizar archivos .pyl" },
  { to: "/plantilla", icon: Download, title: "Descargar Plantilla", desc: "Plantilla Excel P&L" },
  { to: "/ayuda", icon: HelpCircle, title: "Ayuda", desc: "Guía de uso" },
];

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const sourceIcon = (source: string) => {
  switch (source) {
    case "excel": return <FileSpreadsheet size={12} className="text-success" />;
    case "pdf_image": return <Sparkles size={12} className="text-secondary" />;
    case "manual": return <PenLine size={12} className="text-primary" />;
    default: return null;
  }
};

const Index = () => {
  const { pylFiles, loading } = usePylHistory();
  const { restaurants } = useUserRestaurants();
  const navigate = useNavigate();

  const restaurantMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of restaurants) map[r.code] = r.name;
    return map;
  }, [restaurants]);

  const recentPyls = pylFiles.slice(0, 5);

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

      {/* Recent activity from DB */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-muted-foreground" />
            <CardTitle className="text-lg">Actividad reciente</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : recentPyls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay actividad reciente. <Link to="/convertir" className="text-primary hover:underline">Genera tu primer PYL →</Link></p>
          ) : (
            <ul className="divide-y">
              {recentPyls.map((p) => (
                <li
                  key={p.id}
                  className="py-2 flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                  onClick={() => navigate("/visor", { state: { pylContent: p.content } })}
                >
                  <div className="flex items-center gap-2">
                    {sourceIcon(p.source)}
                    <span className="font-medium">{p.filename}</span>
                    {restaurantMap[p.local_code] && (
                      <span className="text-muted-foreground text-xs">— {restaurantMap[p.local_code]}</span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {MONTH_NAMES[parseInt(p.month, 10) - 1]} {p.year} · {new Date(p.created_at).toLocaleDateString("es-ES")}
                  </span>
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
