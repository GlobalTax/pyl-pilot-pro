import { useState, useMemo } from "react";
import { History as HistoryIcon, Download, Eye, Trash2, FileSpreadsheet, Sparkles, PenLine, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { usePylHistory, type PylFile } from "@/hooks/usePylHistory";
import { useUserRestaurants } from "@/hooks/useUserRestaurants";
import { parsePYL, downloadPYL } from "@/lib/pyl";

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const sourceIcon = (source: string) => {
  switch (source) {
    case "excel": return <FileSpreadsheet size={14} className="text-success" />;
    case "pdf_image": return <Sparkles size={14} className="text-secondary" />;
    case "manual": return <PenLine size={14} className="text-primary" />;
    default: return null;
  }
};

const sourceLabel = (source: string) => {
  switch (source) {
    case "excel": return "Excel";
    case "pdf_image": return "IA";
    case "manual": return "Manual";
    default: return source;
  }
};

const History = () => {
  const { pylFiles, loading, deletePyl, deleting } = usePylHistory();
  const { restaurants } = useUserRestaurants();
  const navigate = useNavigate();

  const [filterRestaurant, setFilterRestaurant] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<PylFile | null>(null);

  const restaurantMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of restaurants) map[r.code] = r.name;
    return map;
  }, [restaurants]);

  const years = useMemo(() => [...new Set(pylFiles.map((p) => p.year))].sort().reverse(), [pylFiles]);

  const filtered = useMemo(() => {
    return pylFiles.filter((p) => {
      if (filterRestaurant !== "all" && p.local_code !== filterRestaurant) return false;
      if (filterYear !== "all" && p.year !== filterYear) return false;
      if (filterSource !== "all" && p.source !== filterSource) return false;
      return true;
    });
  }, [pylFiles, filterRestaurant, filterYear, filterSource]);

  const handleDownload = (pyl: PylFile) => {
    try {
      const data = parsePYL(pyl.content);
      downloadPYL(data);
      toast.success(`${pyl.filename} descargado`);
    } catch {
      toast.error("Error al descargar");
    }
  };

  const handleView = (pyl: PylFile) => {
    navigate("/visor", { state: { pylContent: pyl.content } });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePyl(deleteTarget.id);
      toast.success("PYL eliminado");
      setDeleteTarget(null);
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-secondary/10 p-2.5">
          <HistoryIcon className="text-secondary" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-medium text-foreground">Historial</h1>
          <p className="text-sm text-muted-foreground">Todos los archivos PYL generados</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterRestaurant} onValueChange={setFilterRestaurant}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Restaurante" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los locales</SelectItem>
            {restaurants.map((r) => (
              <SelectItem key={r.code} value={r.code}>{r.code} — {r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Año" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Origen" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="excel">Excel</SelectItem>
            <SelectItem value="pdf_image">IA</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">PYLs generados ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm text-muted-foreground">No has generado ningún PYL todavía</p>
              <Button variant="link" asChild><Link to="/convertir">Ir a Convertir →</Link></Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Local</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((pyl) => (
                    <TableRow key={pyl.id}>
                      <TableCell>
                        <span className="font-mono font-medium">{pyl.local_code}</span>
                        {restaurantMap[pyl.local_code] && (
                          <span className="text-muted-foreground ml-1.5 text-xs">— {restaurantMap[pyl.local_code]}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {MONTH_NAMES[parseInt(pyl.month, 10) - 1]} {pyl.year}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 text-xs">
                          {sourceIcon(pyl.source)} {sourceLabel(pyl.source)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(pyl.created_at).toLocaleDateString("es-ES")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleDownload(pyl)} title="Descargar">
                            <Download size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleView(pyl)} title="Ver en Visor">
                            <Eye size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(pyl)} title="Eliminar">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar PYL?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el PYL de <strong>{deleteTarget?.local_code}</strong> ({MONTH_NAMES[parseInt(deleteTarget?.month ?? "1", 10) - 1]} {deleteTarget?.year}). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2">
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default History;
