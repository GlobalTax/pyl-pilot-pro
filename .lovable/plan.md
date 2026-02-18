

## Mejora del prompt de IA para McDonald's Espana

### Problema actual
El prompt actual es generico: solo lista los 43 conceptos por nombre y dice "pon 0 si no aparece". No da contexto sobre:
- Como se presentan los datos en los P&L reales de McDonald's Espana (formato tabular, columnas de importe y porcentaje)
- Que los importes pueden estar en miles de euros o con separador de miles como punto
- Que las lineas de tipo "total" son calculadas y deben ser coherentes
- Alias y variantes de nombres que aparecen en documentos reales
- Donde buscar el codigo del local, el mes y el ano

### Cambios propuestos

**Archivo:** `supabase/functions/extract-pyl/index.ts`

1. **Reescribir el SYSTEM_PROMPT** con instrucciones detalladas:
   - Contexto: los documentos son P&L mensuales de franquicias McDonald's en Espana, generados por el sistema corporativo
   - Formato tipico: tabla con columnas "Concepto | Importe | % sobre Ventas"
   - Mapeo numerado de las 43 lineas con alias comunes (ej. "RBE" = "Resultado Bruto de Explotacion", "PAC" = "Profit After Controllables", "SOI" = "Store Operating Income")
   - Instrucciones sobre formatos numericos: los importes en el documento pueden usar punto como separador de miles y coma como decimal (formato espanol), pero deben devolverse como numeros sin formato
   - Reglas de coherencia: linea 6 = suma lineas 2-5, linea 7 = linea 1 - linea 6, etc.
   - Donde encontrar metadatos: el codigo local suele aparecer como "Rest." o "Local" seguido de un numero; el periodo como "Mes: MM/AAAA" o "Periodo: ..."
   - Instruccion de devolver importes negativos con signo menos cuando corresponda

2. **Mejorar el user prompt** para dar instrucciones de extraccion mas claras junto con la imagen

3. **Agregar descripciones detalladas al tool schema** para cada campo del array `lines`, indicando el indice y nombre de cada linea para guiar mejor al modelo

### Detalle tecnico del nuevo prompt

```
SYSTEM_PROMPT:
- Rol: experto en contabilidad de franquicias McDonald's Espana
- Contexto del documento: P&L mensual del sistema MCPRO / corporativo
- Formato numerico: convertir formato espanol (1.234,56) a numero (1234.56)
- Lista numerada 1-43 con alias para cada concepto
- Reglas de totales calculados (lineas 6, 7, 22, 23, 33, 36, 37, 40, 42)
- Guia para localizar metadatos (ano, mes, codigo restaurante)
- Importes siempre en euros (no miles de euros)
```

### Archivos modificados
- `supabase/functions/extract-pyl/index.ts` - Unico archivo a modificar (reescritura del prompt y mejora del schema de la tool)

