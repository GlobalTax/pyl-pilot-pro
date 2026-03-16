

## Fix duplicados y errores en /restaurants

### Problemas detectados

1. **Columna "Acciones" duplicada** -- lineas 170-171 tienen dos `<TableHead>` de "Acciones"
2. **Columna "Ciudad" duplicada** -- lineas 181-182 muestran la ciudad dos veces en cada fila
3. **Error 400 en la query** -- las peticiones de red muestran `column restaurants.site does not exist` (la migracion puede no haberse aplicado aun). Esto hace que no se carguen los restaurantes.

### Cambios

**`src/pages/Restaurants.tsx`:**
- Eliminar la cabecera `<TableHead>` duplicada de "Acciones" (linea 171)
- Eliminar la celda `<TableCell>` duplicada de ciudad (linea 182)
- Resultado: tabla con columnas Codigo, Nombre, Site, Direccion, Ciudad, Acciones (sin duplicados)

**Verificar migracion de `site`:**
- Confirmar que la columna `site` existe en la base de datos (segun el schema actual, ya existe)
- Si persiste el error 400, el types.ts puede necesitar regenerarse (esto es automatico)

### Archivos afectados
- `src/pages/Restaurants.tsx` -- eliminar lineas duplicadas

