

## Permitir editar el código del restaurante y distinguir Site

### Problema
El diálogo de edición no permite modificar el campo "Código" del restaurante. El usuario necesita poder editarlo, y quiere que "Site" sea un campo distinto del código.

### Cambios

**`src/pages/Restaurants.tsx`:**
- Añadir estado `editCode` y `setEditCode` al formulario de edición
- Rellenar `editCode` con `r.code` al abrir el diálogo
- Añadir un campo `<Input>` para "Código" en el diálogo de edición (antes de "Nombre")
- Incluir `code: editCode.trim()` en la llamada `.update()`
- Validar que el código no esté vacío antes de guardar

### Archivos afectados
- `src/pages/Restaurants.tsx` -- añadir campo código editable en el diálogo de edición

