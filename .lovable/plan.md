

# Modelo de datos PYL — Plan de implementaci贸n

## Resumen
Crear el archivo `src/lib/pyl.ts` con el modelo de datos completo del formato `.pyl`, incluyendo interfaces, constantes de mapeo y funciones de generaci贸n/parseo/descarga.

---

## Archivo a crear

**`src/lib/pyl.ts`** -- un 煤nico archivo con todo el modelo de datos y utilidades.

### Contenido detallado

#### 1. Interface `PYLData`
```ts
interface PYLData {
  year: string;    // "2025"
  month: string;   // "01"-"12"
  localCode: string; // "289"
  lines: number[]; // exactamente 43 elementos
}
```

#### 2. Constante `PYL_LINE_MAP`
Array de 43 objetos `{ lineNumber, label, type }` con el mapeo exacto proporcionado (01-43). El campo `type` sera `"data"` o `"total"` seg煤n lo especificado.

#### 3. Funci贸n `generatePYL(data: PYLData): string`
- Itera sobre las 43 l铆neas generando el formato: `A帽o;Mes;C贸digoLocal;N煤meroL铆nea;Importe`
- N煤mero de l铆nea formateado con zero-padding a 2 d铆gitos ("01", "02", ..., "43")
- Formato de importes: usa `parseFloat(num.toString())` para eliminar trailing zeros innecesarios (316901.30 se convierte en 316901.3, 80.00 en 80)
- Line endings CRLF (`\r\n`)
- Sin salto de l铆nea final extra

#### 4. Funci贸n `parsePYL(content: string): PYLData`
- Normaliza line endings (soporta CRLF y LF)
- Divide en l铆neas, filtra vac铆as
- Valida que haya exactamente 43 l铆neas
- Extrae `year`, `month`, `localCode` de la primera l铆nea
- Parsea el importe de cada l铆nea a `number`
- Lanza error si el formato es inv谩lido

#### 5. Funci贸n `generateFilename(data: PYLData): string`
- Formato: `AAMM + Local + .pyl`
- Ejemplo: year="2025", month="01", localCode="289" genera `2501289.pyl`
- Usa los 煤ltimos 2 d铆gitos del a帽o

#### 6. Funci贸n `downloadPYL(data: PYLData): void`
- Llama a `generatePYL` para obtener el contenido
- Llama a `generateFilename` para el nombre
- Crea un `Blob` con tipo `text/plain`
- Usa un enlace `<a>` temporal con `URL.createObjectURL` para disparar la descarga
- Limpia el objeto URL tras la descarga

---

## Detalles t茅cnicos

- No se necesitan dependencias adicionales
- No se modifican otros archivos en este paso (el archivo se consumir谩 desde las p谩ginas en prompts futuros)
- Todas las funciones se exportan con `export` para uso posterior

