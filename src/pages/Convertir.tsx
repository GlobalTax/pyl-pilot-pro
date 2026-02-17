import { useState, useCallback } from "react";
import { FileOutput, Upload, FileSpreadsheet, Image, CheckCircle2, AlertTriangle, XCircle, Download, ClipboardCheck } from "lucide-react";
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
import { downloadPYL } from "@/lib/pyl";

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

const Convertir = () => {
  const [result, setResult] = useState<ExcelParseResult | null>(null);
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [localCode, setLocalCode] = useState("");
  const [lines, setLines] = useState<DetectedLine[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);

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
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="excel" className="gap-2">
            <FileSpreadsheet size={16} /> Desde Excel
          </TabsTrigger>
          <TabsTrigger value="pdf" className="gap-2">
            <Image size={16} /> Desde PDF/Imagen
          </TabsTrigger>
        </TabsList>

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
              {/* Metadata fields */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Datos del P&L</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Año</Label>
                      <Input
                        id="year"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="2025"
                        maxLength={4}
                        className={!year ? "border-destructive" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="month">Mes</Label>
                      <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className={!month ? "border-destructive" : ""}>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="localCode">Código Local</Label>
                      <Input
                        id="localCode"
                        value={localCode}
                        onChange={(e) => setLocalCode(e.target.value)}
                        placeholder="289"
                        className={!localCode ? "border-destructive" : ""}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleGenerate} className="gap-2">
                  <Download size={16} /> Generar .pyl
                </Button>
                <Button variant="outline" onClick={handleValidate} className="gap-2">
                  <ClipboardCheck size={16} /> Validar totales
                </Button>
              </div>

              {/* Preview table */}
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
                          <TableRow
                            key={line.lineNumber}
                            className={line.type === "total" ? "bg-muted/50 font-semibold" : ""}
                          >
                            <TableCell className="font-mono text-muted-foreground">
                              {String(line.lineNumber).padStart(2, "0")}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <StatusIcon status={line.status} />
                                <span className="text-sm">{line.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="any"
                                value={line.value || ""}
                                onChange={(e) => updateLineValue(i, e.target.value)}
                                className="h-8 text-right text-sm w-full"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <StatusBadge status={line.status} />
                            </TableCell>
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
      </Tabs>

      {/* Validation Dialog */}
      <Dialog open={validationOpen} onOpenChange={setValidationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Validación de Totales</DialogTitle>
            <DialogDescription>
              Comprobación de que los totales cuadran con las sumas esperadas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {validationResults.map((v) => (
              <div
                key={v.lineNumber}
                className={`flex items-center justify-between rounded-md p-3 text-sm ${
                  v.valid ? "bg-success/10" : "bg-destructive/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  {v.valid ? (
                    <CheckCircle2 className="text-success" size={16} />
                  ) : (
                    <XCircle className="text-destructive" size={16} />
                  )}
                  <span>L{String(v.lineNumber).padStart(2, "0")} — {v.label}</span>
                </div>
                <div className="text-right">
                  {v.valid ? (
                    <span className="text-success">{v.actual}</span>
                  ) : (
                    <span className="text-destructive">
                      {v.actual} <span className="text-muted-foreground">→ esperado {v.expected}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
            {validationResults.length > 0 && (
              <p className="text-xs text-muted-foreground pt-2">
                {validationResults.filter((v) => v.valid).length}/{validationResults.length} totales correctos
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Convertir;
