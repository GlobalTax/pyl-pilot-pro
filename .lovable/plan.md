

## Editar usuarios desde el panel Admin

### Resumen
Agregar un boton "Editar" en cada fila de la tabla de usuarios que abra un modal para modificar los datos del usuario: nombre, empresa, tipo de usuario (NRRO/franquiciado) y estado.

### Flujo
1. Admin hace clic en el icono de editar (lapiz) en la fila del usuario
2. Se abre un modal con los campos pre-rellenados: Nombre, Empresa, Tipo de usuario, Estado
3. El admin modifica lo que necesite y pulsa "Guardar"
4. Se actualiza el perfil directamente en la base de datos y se refresca la tabla

### Cambios necesarios

**Modificar `src/pages/Admin.tsx`**

1. Nuevo estado para controlar el modal de edicion:
   - `editTarget`: el perfil que se esta editando (o null)
   - `editName`, `editCompany`, `editUserType`, `editStatus`: campos editables
   - `editSaving`: indicador de carga

2. Funcion `handleEditUser`:
   - Actualiza la tabla `profiles` con los nuevos valores de `full_name`, `company`, `user_type` y `status`
   - Usa `supabase.from("profiles").update(...)` directamente (ya hay politica RLS que permite a admins actualizar cualquier perfil)
   - Refresca la lista al completar

3. Boton de editar en la columna "Acciones":
   - Icono de lapiz (Pencil de lucide-react) junto a los botones existentes
   - Solo visible para usuarios que no sean el admin actual

4. Dialog de edicion con campos:
   - Nombre (Input)
   - Empresa (Input)
   - Tipo de usuario (RadioGroup: Franquiciado / NRRO)
   - Estado (Select: Pendiente / Aprobado / Rechazado)

### Detalles tecnicos

No se necesita nueva edge function ni migracion de base de datos. La politica RLS existente "Admins can update any profile" ya permite estas actualizaciones.

**Archivo a modificar:**
- `src/pages/Admin.tsx` -- anadir estado, dialog y boton de edicion
