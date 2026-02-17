import * as XLSX from "xlsx";
import { PYL_LINE_MAP, type PYLData } from "./pyl";

export interface DetectedLine {
  lineNumber: number;
  label: string;
  type: "data" | "total";
  value: number;
  status: "detected" | "review" | "missing";
}

export interface ExcelParseResult {
  year: string;
  month: string;
  localCode: string;
  lines: DetectedLine[];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[▸►•·\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const LABEL_ALIASES: Record<number, string[]> = {
  1: ["ventas netas", "ventas", "net sales"],
  2: ["comida", "food cost", "coste comida"],
  3: ["comida empleados", "crew food", "empleados comida"],
  4: ["desperdicios", "waste"],
  5: ["papel", "paper"],
  6: ["total coste comida y papel", "total food paper", "total comida papel"],
  7: ["resultado bruto de explotacion", "resultado bruto", "gross profit"],
  8: ["mano de obra", "crew labor", "labor"],
  9: ["mano de obra gerencia", "mgmt labor", "gerencia"],
  10: ["seguridad social", "payroll taxes", "ss"],
  11: ["gastos viajes", "travel", "viajes"],
  12: ["publicidad", "advertising"],
  13: ["promocion", "promotion"],
  14: ["servicios exteriores", "outside services"],
  15: ["uniformes", "uniforms"],
  16: ["suministros operacion", "operating supplies", "suministros"],
  17: ["reparacion y mantenimiento", "repairs maintenance", "r&m", "reparacion mantenimiento"],
  18: ["luz agua telefono", "utilities", "luz agua"],
  19: ["gastos oficina", "office expense", "oficina"],
  20: ["diferencias caja", "cash over short", "diferencias"],
  21: ["varios controlables", "misc controllable"],
  22: ["total gastos controlables", "total controllable"],
  23: ["pac", "p.a.c.", "profit after controllable"],
  24: ["renta", "rent", "base rent"],
  25: ["renta adicional", "additional rent", "percent rent"],
  26: ["royalti", "royalty", "service fee"],
  27: ["oficina legal", "oficina / legal", "legal"],
  28: ["seguros", "insurance"],
  29: ["tasas y licencias", "taxes licenses", "tasas licencias"],
  30: ["depreciaciones amortizaciones", "depreciation", "amortizacion", "depreciaciones"],
  31: ["intereses", "interest"],
  32: ["varios", "miscellaneous", "misc"],
  33: ["total gastos no controlables", "total non controllable"],
  34: ["ventas no producto", "non product sales"],
  35: ["coste no producto", "non product cost"],
  36: ["neto no producto", "net non product"],
  37: ["soi", "s.o.i.", "store operating income"],
  38: ["draw salary", "owner draw"],
  39: ["gastos generales", "general expenses", "g&a"],
  40: ["resultado neto", "net income"],
  41: ["cuota del prestamo", "cuota prestamo", "loan payment"],
  42: ["cash flow", "cashflow", "flujo caja"],
  43: ["inversiones con fondos propios", "inversiones fondos propios", "capital investment"],
};

function fuzzyMatch(input: string): { lineNumber: number; confidence: "detected" | "review" } | null {
  const norm = normalize(input);
  if (!norm || norm.length < 2) return null;

  // Exact match first (longer aliases first for specificity)
  for (const [num, aliases] of Object.entries(LABEL_ALIASES)) {
    const sorted = [...aliases].sort((a, b) => b.length - a.length);
    for (const alias of sorted) {
      if (norm === alias) return { lineNumber: Number(num), confidence: "detected" };
    }
  }

  // Partial match (longer aliases first)
  let bestMatch: { lineNumber: number; aliasLen: number } | null = null;
  for (const [num, aliases] of Object.entries(LABEL_ALIASES)) {
    for (const alias of aliases) {
      if (norm.includes(alias) || alias.includes(norm)) {
        if (!bestMatch || alias.length > bestMatch.aliasLen) {
          bestMatch = { lineNumber: Number(num), aliasLen: alias.length };
        }
      }
    }
  }
  if (bestMatch) return { lineNumber: bestMatch.lineNumber, confidence: "review" };

  return null;
}

function detectMetadata(sheet: XLSX.WorkSheet): { year: string; month: string; localCode: string } {
  const meta = { year: "", month: "", localCode: "" };
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

  for (let r = range.s.r; r <= Math.min(range.e.r, 20); r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell) continue;
      const val = normalize(String(cell.v || ""));
      const nextCell = sheet[XLSX.utils.encode_cell({ r, c: c + 1 })];
      const nextVal = nextCell ? String(nextCell.v || "").trim() : "";

      if (val.includes("ano") || val.includes("year") || val === "ano") {
        if (nextVal && /^\d{4}$/.test(nextVal)) meta.year = nextVal;
      }
      if (val.includes("mes") || val === "month") {
        if (nextVal && /^\d{1,2}$/.test(nextVal)) meta.month = nextVal.padStart(2, "0");
      }
      if (val.includes("local") || val.includes("codigo") || val.includes("code") || val.includes("restaurante")) {
        if (nextVal && /^\d+$/.test(nextVal)) meta.localCode = nextVal;
      }
    }
  }
  return meta;
}

function detectColumns(sheet: XLSX.WorkSheet): { conceptCol: number; amountCol: number } {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const colStats: { texts: number; numbers: number }[] = [];

  for (let c = range.s.c; c <= range.e.c; c++) {
    let texts = 0, numbers = 0;
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell) continue;
      if (typeof cell.v === "number") numbers++;
      else if (typeof cell.v === "string" && cell.v.trim().length > 2) texts++;
    }
    colStats[c] = { texts, numbers };
  }

  let conceptCol = 0, amountCol = 0;
  let maxTexts = 0, maxNumbers = 0;
  colStats.forEach((s, i) => {
    if (s.texts > maxTexts) { maxTexts = s.texts; conceptCol = i; }
    if (s.numbers > maxNumbers) { maxNumbers = s.numbers; amountCol = i; }
  });

  // If same column, try second best for numbers
  if (conceptCol === amountCol) {
    let secondMax = 0;
    colStats.forEach((s, i) => {
      if (i !== conceptCol && s.numbers > secondMax) { secondMax = s.numbers; amountCol = i; }
    });
  }

  return { conceptCol, amountCol };
}

export function parseExcelFile(buffer: ArrayBuffer): ExcelParseResult {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

  const meta = detectMetadata(sheet);
  const { conceptCol, amountCol } = detectColumns(sheet);

  // Build concept-to-amount map from Excel rows
  const excelRows: { concept: string; amount: number; row: number }[] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const conceptCell = sheet[XLSX.utils.encode_cell({ r, c: conceptCol })];
    const amountCell = sheet[XLSX.utils.encode_cell({ r, c: amountCol })];
    if (!conceptCell || typeof conceptCell.v !== "string") continue;
    const concept = String(conceptCell.v).trim();
    if (concept.length < 2) continue;
    const amount = amountCell && typeof amountCell.v === "number" ? amountCell.v : 0;
    excelRows.push({ concept, amount, row: r });
  }

  // Match each PYL line
  const usedRows = new Set<number>();
  const lines: DetectedLine[] = PYL_LINE_MAP.map((pylLine) => {
    // Try to find a matching row, prioritize longer/more specific matches
    let bestRow: typeof excelRows[0] | null = null;
    let bestConfidence: "detected" | "review" = "review";

    for (const row of excelRows) {
      if (usedRows.has(row.row)) continue;
      const match = fuzzyMatch(row.concept);
      if (match && match.lineNumber === pylLine.lineNumber) {
        if (!bestRow || match.confidence === "detected") {
          bestRow = row;
          bestConfidence = match.confidence;
          if (match.confidence === "detected") break;
        }
      }
    }

    if (bestRow) {
      usedRows.add(bestRow.row);
      return {
        lineNumber: pylLine.lineNumber,
        label: pylLine.label,
        type: pylLine.type,
        value: bestRow.amount,
        status: bestConfidence,
      };
    }

    return {
      lineNumber: pylLine.lineNumber,
      label: pylLine.label,
      type: pylLine.type,
      value: 0,
      status: "missing" as const,
    };
  });

  return { ...meta, lines };
}

export interface TotalValidation {
  lineNumber: number;
  label: string;
  expected: number;
  actual: number;
  valid: boolean;
}

export function validateTotals(lines: number[]): TotalValidation[] {
  const l = (n: number) => lines[n - 1] ?? 0;
  const sumRange = (from: number, to: number) => {
    let s = 0;
    for (let i = from; i <= to; i++) s += l(i);
    return s;
  };

  const checks: { line: number; expected: () => number }[] = [
    { line: 6, expected: () => sumRange(2, 5) },
    { line: 7, expected: () => l(1) - l(6) },
    { line: 22, expected: () => sumRange(8, 21) },
    { line: 23, expected: () => l(7) - l(22) },
    { line: 33, expected: () => sumRange(24, 32) },
    { line: 36, expected: () => l(34) - l(35) },
    { line: 37, expected: () => l(23) - l(33) + l(36) },
    { line: 40, expected: () => l(37) - l(38) - l(39) },
    { line: 42, expected: () => l(40) - l(41) },
  ];

  return checks.map((c) => {
    const expected = Math.round(c.expected() * 100) / 100;
    const actual = Math.round(l(c.line) * 100) / 100;
    return {
      lineNumber: c.line,
      label: PYL_LINE_MAP[c.line - 1].label,
      expected,
      actual,
      valid: Math.abs(expected - actual) < 0.01,
    };
  });
}

export function resultToPYLData(result: ExcelParseResult): PYLData {
  return {
    year: result.year,
    month: result.month,
    localCode: result.localCode,
    lines: result.lines.map((l) => l.value),
  };
}
