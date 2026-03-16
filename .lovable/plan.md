

## Editar restaurantes y nuevo campo "Site"

### Situacion actual
- El dialogo de edicion ya existe y permite modificar nombre, direccion y ciudad.
- La tabla `restaurants` NO tiene un campo `site`.
- La RLS ya permite a admins actualizar cualquier restaurante y a franquiciados actualizar los asignados.

### Cambios necesarios

**1. Migracion SQL -- anadir columna `site`**
```sql
ALTER TABLE restaurants ADD COLUMN site text;
```

**2. Modificar `src/pages/Restaurants.tsx`**
- Anadir columna "Site" a la tabla de listado
- Anadir campo `site` en el dialogo de creacion (input con placeholder "https://...")
- Anadir campo `site` en el dialogo de edicion
- Incluir `site` en las llamadas a `insert` y `update`

**3. Modificar `src/hooks/useUserRestaurants.ts`**
- Anadir `site` al select de campos y al tipo `Restaurant`

### Archivos afectados
- `src/hooks/useUserRestaurants.ts` -- tipo + query
- `src/pages/Restaurants.tsx` -- tabla + dialogos

