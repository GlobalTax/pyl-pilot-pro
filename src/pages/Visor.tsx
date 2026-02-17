import { useState, useCallback, useRef } from "react";
import { FileSearch, Upload, Download, FileDown, TrendingUp, TrendingDown, DollarSign, BarChart3, Wallet } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { parsePYL, downloadPYL, PYL_LINE_MAP, type PYLData } from "@/lib/pyl";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function fmtNum(n: number): string {
  const abs = Math.abs(n);
  const parts = abs.toFixed(2).split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "-" : ""}${intPart},${parts[1]}`;
}

function fmtPct(n: number): string {
  const abs = Math.abs(n);
  return `${n < 0 ? "-" : ""}${abs.toFixed(2).replace(".", ",")}%`;
}

// Visual separators before these line numbers
const SEPARATOR_BEFORE = new Set([6, 7, 8, 22, 23, 24, 33, 34, 36, 37, 38, 40, 41, 42]);

const Visor = () => {
  const [data, setData] = useState<PYLData | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".pyl")) {
      toast.error("Por favor sube un archivo .pyl");
      return;
    }
    try {
      const text = await file.text();
      const parsed = parsePYL(text);
      setData(parsed);
      toast.success("Archivo cargado correctamente");
    } catch (e: any) {
      toast.error(`Error al parsear: ${e.message}`);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleExportPdf = useCallback(() => {
    if (!tableRef.current) return;
    window.print();
  }, []);

  const ventas = data ? data.lines[0] : 0;
  const pctVentas = (val: number) => ventas !== 0 ? (val / ventas) * 100 : 0;

  const monthName = data ? MONTH_NAMES[parseInt(data.month, 10) - 1] || data.month : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-secondary/10 p-2.5">
          <FileSearch className="text-secondary" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visor P&L</h1>
          <p className="text-sm text-muted-foreground">Visualiza archivos .pyl como P&L formateado</p>
        </div>
      </div>

      {/* Upload zone */}
      {!data && (
        <Card
          className={`border-2 border-dashed transition-colors cursor-pointer ${
            dragOver ? "border-secondary bg-secondary/5" : "border-border hover:border-secondary/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => document.getElementById("pyl-input")?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Upload className="text-muted-foreground" size={40} />
            <p className="text-sm font-medium text-foreground">Arrastra tu archivo .pyl aquí</p>
            <p className="text-xs text-muted-foreground">o haz clic para seleccionar</p>
            <input
              id="pyl-input"
              type="file"
              accept=".pyl"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setData(null)} className="gap-2">
              <Upload size={16} /> Cargar otro archivo
            </Button>
            <Button variant="outline" onClick={handleExportPdf} className="gap-2">
              <FileDown size={16} /> Exportar PDF
            </Button>
            <Button variant="outline" onClick={() => { downloadPYL(data); toast.success("Archivo descargado"); }} className="gap-2">
              <Download size={16} /> Descargar .pyl
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            {/* P&L Table */}
            <div ref={tableRef} className="print:shadow-none">
              <Card className="overflow-hidden">
                {/* Header */}
                <div className="bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] px-6 py-4">
                  <h2 className="text-lg font-bold">Site {data.localCode}</h2>
                  <p className="text-sm opacity-80">{monthName} {data.year}</p>
                </div>

                {/* Table */}
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground w-10">#</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Concepto</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground w-32">Importe (€)</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground w-24">% s/ Ventas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PYL_LINE_MAP.map((info) => {
                        const idx = info.lineNumber - 1;
                        const value = data.lines[idx];
                        const pct = pctVentas(value);
                        const isTotal = info.type === "total";
                        const showSep = SEPARATOR_BEFORE.has(info.lineNumber);
                        const isNeg = value < 0;

                        return (
                          <tr
                            key={info.lineNumber}
                            className={
                              isTotal
                                ? "bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] font-bold"
                                : `border-b border-border/50 ${showSep ? "border-t-2 border-t-border" : ""}`
                            }
                          >
                            <td className={`px-4 py-2 font-mono text-xs ${isTotal ? "opacity-70" : "text-muted-foreground"}`}>
                              {String(info.lineNumber).padStart(2, "0")}
                            </td>
                            <td className="px-4 py-2">
                              {!isTotal && <span className="text-muted-foreground mr-1.5">▸</span>}
                              {info.label}
                            </td>
                            <td className={`px-4 py-2 text-right font-mono tabular-nums ${isNeg && !isTotal ? "text-destructive" : ""}`}>
                              {fmtNum(value)} €
                            </td>
                            <td className={`px-4 py-2 text-right font-mono tabular-nums text-xs ${isNeg && !isTotal ? "text-destructive" : isTotal ? "" : "text-muted-foreground"}`}>
                              {info.lineNumber === 1 ? "100,00%" : fmtPct(pct)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* KPI Panel */}
            <div className="space-y-4">
              <KpiCard
                icon={<DollarSign size={20} />}
                label="Ventas Netas"
                value={`${fmtNum(ventas)} €`}
                color="text-secondary"
              />
              <KpiCard
                icon={<TrendingUp size={20} />}
                label="Margen Bruto (RBE)"
                value={fmtPct(pctVentas(data.lines[6]))}
                sub={`${fmtNum(data.lines[6])} €`}
                color="text-success"
              />
              <KpiCard
                icon={<BarChart3 size={20} />}
                label="P.A.C."
                value={fmtPct(pctVentas(data.lines[22]))}
                sub={`${fmtNum(data.lines[22])} €`}
                color="text-secondary"
              />
              <KpiCard
                icon={data.lines[39] >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                label="Resultado Neto"
                value={fmtPct(pctVentas(data.lines[39]))}
                sub={`${fmtNum(data.lines[39])} €`}
                color={data.lines[39] >= 0 ? "text-success" : "text-destructive"}
              />
              <KpiCard
                icon={<Wallet size={20} />}
                label="Cash Flow"
                value={`${fmtNum(data.lines[41])} €`}
                color={data.lines[41] >= 0 ? "text-success" : "text-destructive"}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`shrink-0 mt-0.5 ${color}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-lg font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default Visor;
