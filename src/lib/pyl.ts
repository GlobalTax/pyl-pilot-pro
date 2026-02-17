export interface PYLData {
  year: string;
  month: string;
  localCode: string;
  lines: number[];
}

export interface PYLLineInfo {
  lineNumber: number;
  label: string;
  type: "data" | "total";
}

export const PYL_LINE_MAP: PYLLineInfo[] = [
  { lineNumber: 1, label: "Ventas Netas", type: "data" },
  { lineNumber: 2, label: "Comida", type: "data" },
  { lineNumber: 3, label: "Comida Empleados", type: "data" },
  { lineNumber: 4, label: "Desperdicios", type: "data" },
  { lineNumber: 5, label: "Papel", type: "data" },
  { lineNumber: 6, label: "Total Coste Comida y Papel", type: "total" },
  { lineNumber: 7, label: "Resultado Bruto de Explotación", type: "total" },
  { lineNumber: 8, label: "Mano de Obra", type: "data" },
  { lineNumber: 9, label: "Mano de Obra Gerencia", type: "data" },
  { lineNumber: 10, label: "Seguridad Social", type: "data" },
  { lineNumber: 11, label: "Gastos Viajes", type: "data" },
  { lineNumber: 12, label: "Publicidad", type: "data" },
  { lineNumber: 13, label: "Promoción", type: "data" },
  { lineNumber: 14, label: "Servicios Exteriores", type: "data" },
  { lineNumber: 15, label: "Uniformes", type: "data" },
  { lineNumber: 16, label: "Suministros Operación", type: "data" },
  { lineNumber: 17, label: "Reparación y Mantenimiento", type: "data" },
  { lineNumber: 18, label: "Luz, Agua, Teléfono", type: "data" },
  { lineNumber: 19, label: "Gastos Oficina", type: "data" },
  { lineNumber: 20, label: "Diferencias Caja", type: "data" },
  { lineNumber: 21, label: "Varios Controlables", type: "data" },
  { lineNumber: 22, label: "Total Gastos Controlables", type: "total" },
  { lineNumber: 23, label: "P.A.C.", type: "total" },
  { lineNumber: 24, label: "Renta", type: "data" },
  { lineNumber: 25, label: "Renta Adicional", type: "data" },
  { lineNumber: 26, label: "Royalti", type: "data" },
  { lineNumber: 27, label: "Oficina / Legal", type: "data" },
  { lineNumber: 28, label: "Seguros", type: "data" },
  { lineNumber: 29, label: "Tasas y Licencias", type: "data" },
  { lineNumber: 30, label: "Depreciaciones / Amortizaciones", type: "data" },
  { lineNumber: 31, label: "Intereses", type: "data" },
  { lineNumber: 32, label: "Varios", type: "data" },
  { lineNumber: 33, label: "Total Gastos No Controlables", type: "total" },
  { lineNumber: 34, label: "Ventas no Producto", type: "data" },
  { lineNumber: 35, label: "Coste no Producto", type: "data" },
  { lineNumber: 36, label: "Neto No Producto", type: "total" },
  { lineNumber: 37, label: "S.O.I.", type: "total" },
  { lineNumber: 38, label: "Draw Salary", type: "data" },
  { lineNumber: 39, label: "Gastos Generales", type: "data" },
  { lineNumber: 40, label: "Resultado Neto", type: "total" },
  { lineNumber: 41, label: "Cuota del préstamo", type: "data" },
  { lineNumber: 42, label: "Cash Flow", type: "total" },
  { lineNumber: 43, label: "Inversiones con Fondos Propios", type: "data" },
];

function formatAmount(num: number): string {
  return parseFloat(num.toString()).toString();
}

export function generatePYL(data: PYLData): string {
  if (data.lines.length !== 43) {
    throw new Error(`Se esperan exactamente 43 líneas, se recibieron ${data.lines.length}`);
  }

  return data.lines
    .map((amount, i) => {
      const lineNum = String(i + 1).padStart(2, "0");
      return `${data.year};${data.month};${data.localCode};${lineNum};${formatAmount(amount)}`;
    })
    .join("\r\n");
}

export function parsePYL(content: string): PYLData {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim() !== "");

  if (lines.length !== 43) {
    throw new Error(`Formato PYL inválido: se esperan 43 líneas, se encontraron ${lines.length}`);
  }

  const firstParts = lines[0].split(";");
  if (firstParts.length !== 5) {
    throw new Error("Formato PYL inválido: cada línea debe tener 5 campos separados por ';'");
  }

  const year = firstParts[0];
  const month = firstParts[1];
  const localCode = firstParts[2];

  const amounts = lines.map((line, i) => {
    const parts = line.split(";");
    if (parts.length !== 5) {
      throw new Error(`Formato inválido en línea ${i + 1}`);
    }
    const amount = parseFloat(parts[4]);
    if (isNaN(amount)) {
      throw new Error(`Importe inválido en línea ${i + 1}: "${parts[4]}"`);
    }
    return amount;
  });

  return { year, month, localCode, lines: amounts };
}

export function generateFilename(data: PYLData): string {
  const yy = data.year.slice(-2);
  return `${yy}${data.month}${data.localCode}.pyl`;
}

export function downloadPYL(data: PYLData): void {
  const content = generatePYL(data);
  const filename = generateFilename(data);
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
