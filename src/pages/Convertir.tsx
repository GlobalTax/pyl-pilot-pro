import { useState, useCallback, useMemo } from "react";
import { FileOutput, Upload, FileSpreadsheet, Image, CheckCircle2, AlertTriangle, XCircle, Download, ClipboardCheck, PenLine, Eraser, Loader2, Sparkles, Eye } from "lucide-react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { parseExcelFile, validateTotals, resultToPYLData, type ExcelParseResult, type DetectedLine, type TotalValidation } from "@/lib/excel-pyl";
import { downloadPYL, PYL_LINE_MAP } from "@/lib/pyl";
import { supabase } from "@/integrations/supabase/client";
import { useActivity } from "@/contexts/ActivityContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRestaurants } from "@/hooks/useUserRestaurants";
import { RestaurantSelector } from "@/components/RestaurantSelector";
import { checkExistingPyl, savePylToDb } from "@/hooks/usePylHistory";
import { useQueryClient } from "@tanstack/react-query";

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

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

interface PendingSave {
  localCode: string;
  year: string;
  month: string;
  lines: number[];
  source: string;
  existingId: string;
}

const Convertir = () => {
  const { addActivity } = useActivity();
  const { user } = useAuth();
  const { restaurants } = useUserRestaurants();
  const queryClient = useQueryClient();

  // --- Overwrite modal state ---
  const [overwriteOpen, setOverwriteOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const [saving, setSaving] = useState(false);

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

  // --- PDF/Image tab state ---
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [pdfExtracting, setPdfExtracting] = useState(false);
  const [pdfDragOver, setPdfDragOver] = useState(false);
  const [pdfYear, setPdfYear] = useState("");
  const [pdfMonth, setPdfMonth] = useState("");
  const [pdfLocalCode, setPdfLocalCode] = useState("");
  const [pdfLines, setPdfLines] = useState<DetectedLine[]>([]);
  const [pdfValidationOpen, setPdfValidationOpen] = useState(false);

  const pdfValidationResults = useMemo(
    () => (pdfLines.length ? validateTotals(pdfLines.map((l) => l.value)) : []),
    [pdfLines]
  );

  const pdfValidationWarnings = useMemo(
    () => new Map(pdfValidationResults.filter((v) => !v.valid).map((v) => [v.lineNumber, v])),
    [pdfValidationResults]
  );

  // --- Common save logic ---
  const saveAndDownload = async (lc: string, yr: string, mo: string, lineValues: number[], source: string) => {
    // Always download
    downloadPYL({ year: yr, month: mo, localCode: lc, lines: lineValues });
    addActivity({ name: `${yr.slice(-2)}${mo}${lc}.pyl`, date: new Date().toLocaleString("es-ES"), localCode: lc });

    if (!user) {
      toast.success("Archivo descargado (sin sesión, no se guardó en historial)");
      return;
    }

    try {
      const existing = await checkExistingPyl(lc, yr, mo);
      if (existing) {
        setPendingSave({ localCode: lc, year: yr, month: mo, lines: lineValues, source, existingId: existing.id });
        setOverwriteOpen(true);
        return;
      }
      await savePylToDb({ userId: user.id, localCode: lc, year: yr, month: mo, lines: lineValues, source, restaurants });
      queryClient.invalidateQueries({ queryKey: ["pyl-history"] });
      toast.success("PYL descargado y guardado en historial");
    } catch (err: any) {
      console.error("Save error:", err);
      toast.warning("Archivo descargado, pero no se pudo guardar en historial");
    }
  };

  const handleOverwriteConfirm = async () => {
    if (!pendingSave || !user) return;
    setSaving(true);
    try {
      await savePylToDb({
        userId: user.id,
        localCode: pendingSave.localCode,
        year: pendingSave.year,
        month: pendingSave.month,
        lines: pendingSave.lines,
        source: pendingSave.source,
        restaurants,
        existingId: pendingSave.existingId,
      });
      queryClient.invalidateQueries({ queryKey: ["pyl-history"] });
      toast.success("PYL sobrescrito correctamente");
    } catch {
      toast.error("Error al sobrescribir");
    }
    setSaving(false);
    setOverwriteOpen(false);
    setPendingSave(null);
  };

  const handleOverwriteCancel = () => {
    setOverwriteOpen(false);
    setPendingSave(null);
    toast.info("PYL descargado (no se guardó en historial)");
  };

  const handleManualChange = (index: number, raw: string) => {
    const num = raw === "" || raw === "-" ? 0 : parseFloat(raw);
    if (isNaN(num)) return;
    setManualValues((prev) => {
      const next = [...prev];
      next[index] = num;
      return next;
    });
  };

  // --- PDF/Image handlers ---
  const handlePdfFile = useCallback((file: File) => {
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Solo se aceptan archivos PDF, PNG o JPG");
      return;
    }
    setPdfFile(file);
    setPdfLines([]);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPdfPreview(url);
    } else {
      setPdfPreview(null);
    }
  }, []);

  const handlePdfExtract = useCallback(async () => {
    if (!pdfFile) return;
    setPdfExtracting(true);
    try {
      const base64 = await fileToBase64(pdfFile);
      const { data, error } = await supabase.functions.invoke("extract-pyl", {
        body: { fileBase64: base64, mimeType: pdfFile.type },
      });
      if (error) throw new Error(error.message || "Error al llamar a la IA");
      if (data?.error) throw new Error(data.error);

      const extracted = data;
      if (extracted.year) setPdfYear(extracted.year);
      if (extracted.month) setPdfMonth(extracted.month);
      if (extracted.localCode) setPdfLocalCode(extracted.localCode);

      const detectedLines: DetectedLine[] = PYL_LINE_MAP.map((info, i) => ({
        lineNumber: info.lineNumber,
        label: info.label,
        type: info.type,
        value: extracted.lines[i] ?? 0,
        status: (extracted.lines[i] !== 0 ? "detected" : "missing") as DetectedLine["status"],
      }));
      setPdfLines(detectedLines);
      const count = detectedLines.filter((l) => l.status === "detected").length;
      toast.success(`Extracción completada: ${count}/43 líneas detectadas`);
    } catch (e: any) {
      console.error("Extract error:", e);
      toast.error(`Error de extracción: ${e.message}. Prueba la pestaña Excel o Manual.`);
    } finally {
      setPdfExtracting(false);
    }
  }, [pdfFile]);

  const updatePdfLineValue = (index: number, value: string) => {
    const num = value === "" ? 0 : parseFloat(value);
    if (isNaN(num)) return;
    setPdfLines((prev) => prev.map((l, i) => i === index ? { ...l, value: num, status: l.status === "missing" && num !== 0 ? "review" : l.status } : l));
  };

  const handlePdfGenerate = () => {
    if (!pdfYear || !pdfMonth || !pdfLocalCode) {
      toast.error("Completa Año, Mes y Código Local antes de generar");
      return;
    }
    if (!/^\d{4}$/.test(pdfYear)) { toast.error("El año debe tener 4 dígitos"); return; }
    const data = resultToPYLData({ year: pdfYear, month: pdfMonth, localCode: pdfLocalCode, lines: pdfLines });
    saveAndDownload(pdfLocalCode, pdfYear, pdfMonth, data.lines, "pdf_image");
  };

  const handleManualGenerate = () => {
    if (!manualYear || !manualMonth || !manualLocalCode) {
      toast.error("Completa Año, Mes y Código Local antes de generar");
      return;
    }
    if (!/^\d{4}$/.test(manualYear)) { toast.error("El año debe tener 4 dígitos"); return; }
    saveAndDownload(manualLocalCode, manualYear, manualMonth, computedManual, "manual");
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
    saveAndDownload(localCode, year, month, data.lines, "excel");
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
          <h1 className="text-2xl font-medium text-foreground">Convertir a PYL</h1>
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
                    <RestaurantSelector value={localCode} onChange={setLocalCode} />
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
                          <TableRow key={line.lineNumber} className={line.type === "total" ? "bg-muted/50 font-medium" : ""}>
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
        <TabsContent value="pdf" className="mt-6 space-y-6">
          {/* Drop zone */}
          <Card
            className={`border-2 border-dashed transition-colors cursor-pointer ${
              pdfDragOver ? "border-secondary bg-secondary/5" : "border-border hover:border-secondary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setPdfDragOver(true); }}
            onDragLeave={() => setPdfDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setPdfDragOver(false); const f = e.dataTransfer.files[0]; if (f) handlePdfFile(f); }}
            onClick={() => document.getElementById("pdf-input")?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <Upload className="text-muted-foreground" size={40} />
              <p className="text-sm font-medium text-foreground">Arrastra tu PDF o imagen aquí</p>
              <p className="text-xs text-muted-foreground">o haz clic para seleccionar (.pdf, .png, .jpg)</p>
              <input
                id="pdf-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); }}
              />
            </CardContent>
          </Card>

          {pdfFile && (
            <>
              {/* Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2"><Eye size={18} /> Vista previa</CardTitle>
                </CardHeader>
                <CardContent>
                  {pdfPreview ? (
                    <img src={pdfPreview} alt="Preview" className="max-h-64 mx-auto rounded-md border" />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileOutput size={16} />
                      <span>{pdfFile.name} ({(pdfFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Datos del P&L</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Año</Label>
                      <Input value={pdfYear} onChange={(e) => setPdfYear(e.target.value)} placeholder="2025" maxLength={4} className={!pdfYear ? "border-destructive" : ""} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mes</Label>
                      <Select value={pdfMonth} onValueChange={setPdfMonth}>
                        <SelectTrigger className={!pdfMonth ? "border-destructive" : ""}><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>{MONTHS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <RestaurantSelector value={pdfLocalCode} onChange={setPdfLocalCode} />
                  </div>
                </CardContent>
              </Card>

              {/* Extract button */}
              {pdfLines.length === 0 && (
                <Button onClick={handlePdfExtract} disabled={pdfExtracting} className="gap-2">
                  {pdfExtracting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {pdfExtracting ? "Extrayendo datos..." : "Extraer datos con IA"}
                </Button>
              )}

              {/* Results */}
              {pdfLines.length > 0 && (
                <>
                  {pdfValidationWarnings.size > 0 && (
                    <Card className="border-warning/50 bg-warning/5">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-2 text-warning text-sm font-medium mb-2">
                          <AlertTriangle size={16} />
                          {pdfValidationWarnings.size} total(es) no coinciden con las sumas esperadas
                        </div>
                        <div className="space-y-1">
                          {Array.from(pdfValidationWarnings.values()).map((v) => (
                            <div key={v.lineNumber} className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>L{String(v.lineNumber).padStart(2, "0")} — {v.label}</span>
                              <span className="text-destructive font-mono">{v.actual} → esperado {v.expected}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handlePdfGenerate} className="gap-2"><Download size={16} /> Generar .pyl</Button>
                    <Button variant="outline" onClick={() => setPdfValidationOpen(true)} className="gap-2"><ClipboardCheck size={16} /> Validar totales</Button>
                    <Button variant="outline" onClick={handlePdfExtract} disabled={pdfExtracting} className="gap-2">
                      {pdfExtracting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      Re-extraer
                    </Button>
                  </div>

                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Previsualización</CardTitle>
                      <CardDescription>
                        {pdfLines.filter((l) => l.status === "detected").length} detectadas ·{" "}
                        {pdfLines.filter((l) => l.status === "missing").length} vacías — Puedes editar cualquier valor
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
                            {pdfLines.map((line, i) => {
                              const warning = pdfValidationWarnings.get(line.lineNumber);
                              return (
                              <TableRow key={line.lineNumber} className={`${line.type === "total" ? "bg-muted/50 font-medium" : ""} ${warning ? "bg-warning/5" : ""}`}>
                                <TableCell className="font-mono text-muted-foreground">{String(line.lineNumber).padStart(2, "0")}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {warning ? <AlertTriangle className="text-warning" size={16} /> : <StatusIcon status={line.status} />}
                                    <span className="text-sm">{line.label}</span>
                                    {warning && <span className="text-xs text-warning">(esperado {warning.expected})</span>}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input type="number" step="any" value={line.value || ""} onChange={(e) => updatePdfLineValue(i, e.target.value)} className={`h-8 text-right text-sm w-full ${warning ? "border-warning" : ""}`} />
                                </TableCell>
                                <TableCell className="text-center"><StatusBadge status={line.status} /></TableCell>
                              </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
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
                <RestaurantSelector value={manualLocalCode} onChange={setManualLocalCode} />
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
                        isTotal ? "bg-primary text-primary-foreground font-medium" : ""
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

      {/* PDF Validation Dialog */}
      <Dialog open={pdfValidationOpen} onOpenChange={setPdfValidationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Validación de Totales (IA)</DialogTitle>
            <DialogDescription>Comprobación de que los totales extraídos cuadran con las sumas esperadas</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {pdfValidationResults.map((v) => (
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
            {pdfValidationResults.length > 0 && (
              <p className="text-xs text-muted-foreground pt-2">{pdfValidationResults.filter((v) => v.valid).length}/{pdfValidationResults.length} totales correctos</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Overwrite Confirmation */}
      <AlertDialog open={overwriteOpen} onOpenChange={(open) => { if (!open) handleOverwriteCancel(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>PYL ya existente</AlertDialogTitle>
            <AlertDialogDescription>
              Ya existe un PYL para el Local <strong>{pendingSave?.localCode}</strong> — {pendingSave?.month}/{pendingSave?.year}. ¿Quieres sobrescribirlo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving} onClick={handleOverwriteCancel}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleOverwriteConfirm} disabled={saving} className="gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null} Sobrescribir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Convertir;
