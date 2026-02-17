import { useState, useCallback, useMemo } from "react";
import { FileOutput, Upload, FileSpreadsheet, Image, CheckCircle2, AlertTriangle, XCircle, Download, ClipboardCheck, PenLine, Eraser } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { parseExcelFile, validateTotals, resultToPYLData, type ExcelParseResult, type DetectedLine } from "@/lib/excel-pyl";
import { downloadPYL, PYL_LINE_MAP } from "@/lib/pyl";

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

const StatusIcon = ({ status }: { status: DetectedLine["status"] }) => {
  if (status === "detected") return <CheckCircle2 className="text-success" size={16} />;
  if (status === "review") return <AlertTriangle className="text-warning" size={16} />;
  return <XCircle className="text-destructive" size={16} />;
};

const StatusBadge = ({ status }: { status: DetectedLine["status"] }) => {
  const map = {
    detected: { label: "OK", variant: "default" as const, className: "bg-success hover:bg-success/90 text-success-foreground" },
    review: { label: "Revisar", variant: "secondary" as const, className: "bg-warning hover:bg-warning/90 text-warning-foreground" },
    missing: { label: "Vacío", variant: "destructive" as const, className: "" },
  };
  const m = map[status];
  return <Badge variant={m.variant} className={m.className}>{m.label}</Badge>;
};

// --- Manual tab helpers ---

const SECTIONS = [
  { title: "Ventas y Costes", from: 1, to: 7, bg: "" },
  { title: "Gastos Controlables", from: 8, to: 23, bg: "bg-muted/30" },
  { title: "Gastos No Controlables", from: 24, to: 33, bg: "" },
  { title: "No Producto", from: 34, to: 37, bg: "bg-muted/30" },
  { title: "Resultado", from: 38, to: 43, bg: "bg-primary/5" },
];

function computeTotals(v: number[]): number[] {
  const r = [...v];
  r[5] = r[1] + r[2] + r[3] + r[4]; // L06
  r[6] = r[0] - r[5]; // L07
  let sum = 0;
  for (let i = 7; i <= 20; i++) sum += r[i];
  r[21] = sum; // L22
  r[22] = r[6] - r[21]; // L23
  sum = 0;
  for (let i = 23; i <= 31; i++) sum += r[i];
  r[32] = sum; // L33
  r[35] = r[33] - r[34]; // L36
  r[36] = r[22] - r[32] + r[35]; // L37
  r[39] = r[36] - r[37] - r[38]; // L40
  r[41] = r[39] + r[29] + r[40]; // L42
  return r;
}

const Convertir = () => {
  // --- Excel tab state ---
  const [result, setResult] = useState<ExcelParseResult | null>(null);
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [localCode, setLocalCode] = useState("");
  const [lines, setLines] = useState<DetectedLine[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);

  // --- Manual tab state ---
  const [manualYear, setManualYear] = useState("");
  const [manualMonth, setManualMonth] = useState("");
  const [manualLocalCode, setManualLocalCode] = useState("");
  const [manualValues, setManualValues] = useState<number[]>(Array(43).fill(0));

  const computedManual = useMemo(() => computeTotals(manualValues), [manualValues]);

  const handleManualChange = (index: number, raw: string) => {
    const num = raw === "" || raw === "-" ? 0 : parseFloat(raw);
    if (isNaN(num)) return;
    setManualValues((prev) => {
      const next = [...prev];
      next[index] = num;
      return next;
    });
  };

  const handleManualGenerate = () => {
    if (!manualYear || !manualMonth || !manualLocalCode) {
      toast.error("Completa Año, Mes y Código Local antes de generar");
      return;
    }
    if (!/^\d{4}$/.test(manualYear)) { toast.error("El año debe tener 4 dígitos"); return; }
    downloadPYL({ year: manualYear, month: manualMonth, localCode: manualLocalCode, lines: computedManual });
    toast.success(`Archivo ${manualYear.slice(-2)}${manualMonth}${manualLocalCode}.pyl descargado`);
  };

  const handleManualClear = () => {
    setManualYear("");
    setManualMonth("");
    setManualLocalCode("");
    setManualValues(Array(43).fill(0));
    toast.info("Formulario limpiado");
  };

  // --- Excel tab handlers ---
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Por favor sube un archivo Excel (.xlsx o .xls)");
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseExcelFile(buffer);
      setResult(parsed);
      setYear(parsed.year);
      setMonth(parsed.month);
      setLocalCode(parsed.localCode);
      setLines(parsed.lines);
      const detected = parsed.lines.filter((l) => l.status === "detected").length;
      toast.success(`Archivo procesado: ${detected}/43 líneas detectadas`);
    } catch (e: any) {
      toast.error(`Error al procesar: ${e.message}`);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const updateLineValue = (index: number, value: string) => {
    const num = value === "" ? 0 : parseFloat(value);
    if (isNaN(num)) return;
    setLines((prev) => prev.map((l, i) => i === index ? { ...l, value: num, status: l.status === "missing" && num !== 0 ? "review" : l.status } : l));
  };

  const handleGenerate = () => {
    if (!year || !month || !localCode) {
      toast.error("Completa Año, Mes y Código Local antes de generar");
      return;
    }
    if (!/^\d{4}$/.test(year)) { toast.error("El año debe tener 4 dígitos"); return; }
    const data = resultToPYLData({ year, month, localCode, lines });
    downloadPYL(data);
    toast.success(`Archivo ${year.slice(-2)}${month}${localCode}.pyl descargado`);
  };

  const handleValidate = () => setValidationOpen(true);

  const validationResults = lines.length ? validateTotals(lines.map((l) => l.value)) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-secondary/10 p-2.5">
          <FileOutput className="text-secondary" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Convertir a PYL</h1>
          <p className="text-sm text-muted-foreground">Convierte tu P&L a formato .pyl</p>
        </div>
      </div>

      <Tabs defaultValue="excel" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="excel" className="gap-2">
            <FileSpreadsheet size={16} /> Desde Excel
          </TabsTrigger>
          <TabsTrigger value="pdf" className="gap-2">
            <Image size={16} /> PDF/Imagen
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <PenLine size={16} /> Manual
          </TabsTrigger>
        </TabsList>

        {/* ====== EXCEL TAB ====== */}
        <TabsContent value="excel" className="mt-6 space-y-6">
          {/* Drop zone */}
          <Card
            className={`border-2 border-dashed transition-colors cursor-pointer ${
              dragOver ? "border-secondary bg-secondary/5" : "border-border hover:border-secondary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById("excel-input")?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <Upload className="text-muted-foreground" size={40} />
              <p className="text-sm font-medium text-foreground">Arrastra tu archivo Excel aquí</p>
              <p className="text-xs text-muted-foreground">o haz clic para seleccionar (.xlsx, .xls)</p>
              <input
                id="excel-input"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={onFileChange}
              />
            </CardContent>
          </Card>

          {/* Metadata + Preview */}
          {result && (
            <>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Datos del P&L</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Año</Label>
                      <Input id="year" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2025" maxLength={4} className={!year ? "border-destructive" : ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="month">Mes</Label>
                      <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className={!month ? "border-destructive" : ""}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>{MONTHS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="localCode">Código Local</Label>
                      <Input id="localCode" value={localCode} onChange={(e) => setLocalCode(e.target.value)} placeholder="289" className={!localCode ? "border-destructive" : ""} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleGenerate} className="gap-2"><Download size={16} /> Generar .pyl</Button>
                <Button variant="outline" onClick={handleValidate} className="gap-2"><ClipboardCheck size={16} /> Validar totales</Button>
              </div>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Previsualización</CardTitle>
                  <CardDescription>
                    {lines.filter((l) => l.status === "detected").length} detectadas ·{" "}
                    {lines.filter((l) => l.status === "review").length} a revisar ·{" "}
                    {lines.filter((l) => l.status === "missing").length} vacías
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[60vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Línea</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead className="w-40 text-right">Valor</TableHead>
                          <TableHead className="w-20 text-center">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, i) => (
                          <TableRow key={line.lineNumber} className={line.type === "total" ? "bg-muted/50 font-semibold" : ""}>
                            <TableCell className="font-mono text-muted-foreground">{String(line.lineNumber).padStart(2, "0")}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <StatusIcon status={line.status} />
                                <span className="text-sm">{line.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input type="number" step="any" value={line.value || ""} onChange={(e) => updateLineValue(i, e.target.value)} className="h-8 text-right text-sm w-full" />
                            </TableCell>
                            <TableCell className="text-center"><StatusBadge status={line.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ====== PDF TAB ====== */}
        <TabsContent value="pdf" className="mt-6">
          <Card className="w-full max-w-md mx-auto text-center">
            <CardHeader>
              <div className="mx-auto mb-2 rounded-full bg-secondary/10 p-3 w-fit">
                <Image className="text-secondary" size={28} />
              </div>
              <CardTitle>Desde PDF/Imagen</CardTitle>
              <CardDescription>Conversión desde PDF o imagen escaneada</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Funcionalidad próximamente disponible.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== MANUAL TAB ====== */}
        <TabsContent value="manual" className="mt-6 space-y-6">
          {/* Header fields */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Datos del P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Año</Label>
                  <Input value={manualYear} onChange={(e) => setManualYear(e.target.value)} placeholder="2025" maxLength={4} className={!manualYear ? "border-destructive" : ""} />
                </div>
                <div className="space-y-2">
                  <Label>Mes</Label>
                  <Select value={manualMonth} onValueChange={setManualMonth}>
                    <SelectTrigger className={!manualMonth ? "border-destructive" : ""}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{MONTHS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Código Local</Label>
                  <Input value={manualLocalCode} onChange={(e) => setManualLocalCode(e.target.value)} placeholder="289" className={!manualLocalCode ? "border-destructive" : ""} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleManualGenerate} className="gap-2"><Download size={16} /> Generar .pyl</Button>
            <Button variant="outline" onClick={handleManualClear} className="gap-2"><Eraser size={16} /> Limpiar formulario</Button>
          </div>

          {/* Sections */}
          {SECTIONS.map((section) => (
            <Card key={section.title} className={section.bg}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {PYL_LINE_MAP.filter((l) => l.lineNumber >= section.from && l.lineNumber <= section.to).map((line) => {
                  const idx = line.lineNumber - 1;
                  const isTotal = line.type === "total";
                  const value = computedManual[idx];

                  return (
                    <div
                      key={line.lineNumber}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 ${
                        isTotal ? "bg-primary text-primary-foreground font-bold" : ""
                      }`}
                    >
                      <span className={`font-mono text-xs w-8 shrink-0 ${isTotal ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {String(line.lineNumber).padStart(2, "0")}
                      </span>
                      <span className="flex-1 text-sm truncate">{line.label}</span>
                      {isTotal ? (
                        <span className="w-36 text-right font-mono text-sm tabular-nums">
                          {value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <Input
                          type="number"
                          step="any"
                          value={manualValues[idx] || ""}
                          onChange={(e) => handleManualChange(idx, e.target.value)}
                          className="h-8 w-36 text-right text-sm"
                        />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Validation Dialog */}
      <Dialog open={validationOpen} onOpenChange={setValidationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Validación de Totales</DialogTitle>
            <DialogDescription>Comprobación de que los totales cuadran con las sumas esperadas</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {validationResults.map((v) => (
              <div key={v.lineNumber} className={`flex items-center justify-between rounded-md p-3 text-sm ${v.valid ? "bg-success/10" : "bg-destructive/10"}`}>
                <div className="flex items-center gap-2">
                  {v.valid ? <CheckCircle2 className="text-success" size={16} /> : <XCircle className="text-destructive" size={16} />}
                  <span>L{String(v.lineNumber).padStart(2, "0")} — {v.label}</span>
                </div>
                <div className="text-right">
                  {v.valid ? (
                    <span className="text-success">{v.actual}</span>
                  ) : (
                    <span className="text-destructive">{v.actual} <span className="text-muted-foreground">→ esperado {v.expected}</span></span>
                  )}
                </div>
              </div>
            ))}
            {validationResults.length > 0 && (
              <p className="text-xs text-muted-foreground pt-2">{validationResults.filter((v) => v.valid).length}/{validationResults.length} totales correctos</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Convertir;
