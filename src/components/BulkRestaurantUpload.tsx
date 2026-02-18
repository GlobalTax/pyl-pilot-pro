import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, ImageIcon, List, Loader2, Trash2, Plus, Save } from "lucide-react";
import * as XLSX from "xlsx";

interface RestaurantRow {
  code: string;
  name: string;
  city: string;
  address: string;
}

interface BulkRestaurantUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const EMPTY_ROW: RestaurantRow = { code: "", name: "", city: "", address: "" };

const BulkRestaurantUpload = ({ open, onOpenChange, onComplete }: BulkRestaurantUploadProps) => {
  const [tab, setTab] = useState("excel");
  const [rows, setRows] = useState<RestaurantRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [textInput, setTextInput] = useState("");

  const updateRow = (index: number, field: keyof RestaurantRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  };

  // ---- Excel ----
  const handleExcelUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

        if (data.length === 0) {
          toast.error("El archivo está vacío");
          return;
        }

        // Auto-detect columns
        const headers = Object.keys(data[0]).map((h) => h.toLowerCase().trim());
        const findCol = (keywords: string[]) => {
          const key = Object.keys(data[0]).find((k) =>
            keywords.some((kw) => k.toLowerCase().trim().includes(kw))
          );
          return key || null;
        };

        const codeCol = findCol(["codigo", "código", "code", "cod", "nº", "num", "numero", "número", "local", "rest"]);
        const nameCol = findCol(["nombre", "name", "restaurante", "restaurant", "denominacion", "denominación"]);
        const cityCol = findCol(["ciudad", "city", "localidad", "población", "poblacion", "municipio"]);
        const addressCol = findCol(["direccion", "dirección", "address", "domicilio", "calle"]);

        if (!codeCol && !nameCol) {
          toast.error("No se encontraron columnas de Código o Nombre. Asegúrate de que el Excel tenga encabezados reconocibles.");
          return;
        }

        const parsed: RestaurantRow[] = data
          .map((row) => ({
            code: String(row[codeCol || ""] ?? "").trim(),
            name: String(row[nameCol || ""] ?? "").trim(),
            city: String(row[cityCol || ""] ?? "").trim(),
            address: String(row[addressCol || ""] ?? "").trim(),
          }))
          .filter((r) => r.code || r.name);

        if (parsed.length === 0) {
          toast.error("No se encontraron restaurantes válidos");
          return;
        }

        setRows(parsed);
        toast.success(`${parsed.length} restaurantes detectados`);
      } catch {
        toast.error("Error al leer el archivo Excel");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }, []);

  // ---- Image / AI ----
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("extract-restaurants", {
        body: { fileBase64: base64, mimeType: file.type },
      });

      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Error en la extracción");
        return;
      }

      const extracted: RestaurantRow[] = (data.restaurants || []).map((r: any) => ({
        code: String(r.code || "").trim(),
        name: String(r.name || "").trim(),
        city: String(r.city || "").trim(),
        address: String(r.address || "").trim(),
      }));

      if (extracted.length === 0) {
        toast.error("No se detectaron restaurantes en la imagen");
        return;
      }

      setRows((prev) => [...prev, ...extracted]);
      toast.success(`${extracted.length} restaurantes extraídos con IA`);
    } catch {
      toast.error("Error al procesar la imagen");
    } finally {
      setExtracting(false);
      e.target.value = "";
    }
  }, []);

  // ---- Text ----
  const handleParseText = useCallback(() => {
    if (!textInput.trim()) return;

    const lines = textInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed: RestaurantRow[] = lines.map((line) => {
      // Try tab/semicolon/comma separated
      const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
      const parts = line.split(sep).map((p) => p.trim());
      return {
        code: parts[0] || "",
        name: parts[1] || "",
        city: parts[2] || "",
        address: parts[3] || "",
      };
    });

    setRows((prev) => [...prev, ...parsed]);
    setTextInput("");
    toast.success(`${parsed.length} líneas añadidas`);
  }, [textInput]);

  // ---- Save ----
  const handleSave = async () => {
    const valid = rows.filter((r) => r.code.trim() && r.name.trim());
    if (valid.length === 0) {
      toast.error("No hay restaurantes válidos (necesitan código y nombre)");
      return;
    }

    setSaving(true);
    const toInsert = valid.map((r) => ({
      code: r.code.trim(),
      name: r.name.trim(),
      city: r.city.trim() || null,
      address: r.address.trim() || null,
    }));

    const { error } = await supabase.from("restaurants").insert(toInsert);

    if (error) {
      if (error.code === "23505") {
        toast.error("Algunos códigos de restaurante ya existen. Revisa los duplicados.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success(`${valid.length} restaurantes creados`);
      setRows([]);
      onOpenChange(false);
      onComplete();
    }
    setSaving(false);
  };

  const validCount = rows.filter((r) => r.code.trim() && r.name.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Alta masiva de restaurantes</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="excel" className="gap-1.5"><Upload size={14} /> Excel</TabsTrigger>
            <TabsTrigger value="image" className="gap-1.5"><ImageIcon size={14} /> Imagen / IA</TabsTrigger>
            <TabsTrigger value="text" className="gap-1.5"><List size={14} /> Texto</TabsTrigger>
          </TabsList>

          <TabsContent value="excel" className="mt-4">
            <div className="space-y-2">
              <Label>Sube un archivo Excel (.xlsx, .xls, .csv)</Label>
              <p className="text-xs text-muted-foreground">
                El sistema detecta automáticamente las columnas: Código, Nombre, Ciudad, Dirección
              </p>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
              />
            </div>
          </TabsContent>

          <TabsContent value="image" className="mt-4">
            <div className="space-y-2">
              <Label>Sube una foto o captura de pantalla con datos de restaurantes</Label>
              <p className="text-xs text-muted-foreground">
                La IA detectará los códigos, nombres y demás datos automáticamente
              </p>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={extracting}
              />
              {extracting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" /> Extrayendo datos con IA...
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="text" className="mt-4">
            <div className="space-y-2">
              <Label>Pega una lista de restaurantes</Label>
              <p className="text-xs text-muted-foreground">
                Un restaurante por línea. Separa campos con tabulador, punto y coma o coma: código;nombre;ciudad;dirección
              </p>
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={"289;Diagonal Mar;Barcelona;Av. Diagonal 3\n301;Gran Vía;Madrid;Gran Vía 45"}
                rows={5}
              />
              <Button onClick={handleParseText} disabled={!textInput.trim()} variant="outline" className="gap-1.5">
                <Plus size={14} /> Añadir a la tabla
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Review Table */}
        {rows.length > 0 && (
          <div className="flex-1 overflow-auto border rounded-md mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Código *</TableHead>
                  <TableHead>Nombre *</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} className={!r.code.trim() || !r.name.trim() ? "opacity-50" : ""}>
                    <TableCell className="p-1">
                      <Input
                        value={r.code}
                        onChange={(e) => updateRow(i, "code", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        value={r.name}
                        onChange={(e) => updateRow(i, "name", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        value={r.city}
                        onChange={(e) => updateRow(i, "city", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        value={r.address}
                        onChange={(e) => updateRow(i, "address", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeRow(i)}>
                        <Trash2 size={12} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t mt-2">
          <div className="flex items-center gap-2">
            {rows.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {validCount} de {rows.length} restaurantes válidos
              </p>
            )}
            <Button size="sm" variant="outline" onClick={addRow} className="gap-1">
              <Plus size={12} /> Fila
            </Button>
          </div>
          <Button onClick={handleSave} disabled={saving || validCount === 0} className="gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar {validCount > 0 ? `(${validCount})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkRestaurantUpload;
