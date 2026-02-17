

# Pestaña "Manual" en Convertir a PYL

## Resumen
Agregar una tercera pestaña "Manual" en la pagina de conversion que permite introducir los 43 valores del P&L a mano, con calculo automatico de totales y organizacion visual por secciones.

---

## Cambios en archivos

### 1. `src/pages/Convertir.tsx`

**Modificaciones:**
- Cambiar el `TabsList` de 2 columnas a 3 (`grid-cols-3`) y agregar la pestaña "Manual" con icono `PenLine` de Lucide.
- Agregar un nuevo `TabsContent value="manual"` con el formulario completo.

**Estructura del formulario manual:**

- **Cabecera:** Campos de Ano, Mes (dropdown 01-12), Codigo Local -- reutilizando el mismo patron visual de la pestana Excel.
- **Secciones visuales** con las 43 lineas agrupadas:

| Seccion | Lineas | Fondo |
|---------|--------|-------|
| Ventas y Costes | 01-07 | Blanco |
| Gastos Controlables | 08-23 | Gris claro (`bg-muted/30`) |
| Gastos No Controlables | 24-33 | Blanco |
| No Producto | 34-37 | Gris claro |
| Resultado | 38-43 | Azul claro (`bg-primary/5`) |

- Las lineas tipo `data` muestran un input numerico editable.
- Las lineas tipo `total` se muestran en negrita con fondo azul oscuro (`bg-primary`) y texto blanco, sin input (valor calculado automaticamente).

**Calculos automaticos (via `useMemo` o recalculo en `onChange`):**
- L06 = L02 + L03 + L04 + L05
- L07 = L01 - L06
- L22 = sum(L08..L21)
- L23 = L07 - L22
- L33 = sum(L24..L32)
- L36 = L34 - L35
- L37 = L23 - L33 + L36
- L40 = L37 - L38 - L39
- L42 = L40 + L30 + L41

Los valores calculados se aplican al array de 43 numeros tras cada cambio de cualquier input.

**Botones:**
- "Generar .pyl": misma logica que la pestana Excel (valida metadata, llama a `downloadPYL`).
- "Limpiar formulario": resetea todos los inputs a 0 y los campos de cabecera a vacio.

**Estado:** Nuevas variables de estado `manualYear`, `manualMonth`, `manualLocalCode`, `manualValues` (array de 43 numeros inicializados a 0), independientes de la pestana Excel.

---

## Detalles tecnicos

- Se importa `PYL_LINE_MAP` de `src/lib/pyl.ts` para obtener labels y tipos.
- Se define una constante con los rangos de seccion para iterar y agrupar las lineas.
- Los totales se recalculan con una funcion `computeTotals(values: number[]): number[]` que retorna el array completo con los totales actualizados -- se invoca en cada cambio de input.
- No se crean archivos nuevos; toda la logica queda dentro de `Convertir.tsx`.
- Formato numerico en los inputs: `type="number"` con `step="any"` para permitir decimales.

