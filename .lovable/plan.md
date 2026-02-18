

## Cambiar contrasenas de usuarios desde el panel Admin

### Resumen
Anadir un boton en las acciones de cada usuario que permita al super admin establecer una nueva contrasena para ese usuario. Requiere una edge function porque cambiar la contrasena de otro usuario necesita la Admin Auth API (service role key), que no se puede usar desde el cliente.

### Flujo
1. Admin hace clic en el icono de llave en la fila del usuario
2. Se abre un dialogo pidiendo la nueva contrasena (con campo de confirmacion)
3. Al confirmar, se llama a la edge function que valida el rol admin y actualiza la contrasena
4. Se muestra un toast de exito o error

### Cambios necesarios

**1. Nueva edge function: `supabase/functions/update-user-password/index.ts`**

- Recibe `{ user_id, new_password }` en el body
- Verifica que el llamante tiene rol admin (mismo patron que `delete-user`)
- Impide que el admin se cambie la contrasena a si mismo por esta via (debe usar el flujo normal)
- Valida que la contrasena tenga al menos 6 caracteres
- Llama a `adminClient.auth.admin.updateUserById(user_id, { password: new_password })`
- Devuelve exito o error

**2. Modificar `src/pages/Admin.tsx`**

- Nuevo estado: `passwordTarget` (perfil seleccionado), `newPassword`, `confirmPassword`, `passwordSaving`
- Nuevo Dialog con dos campos: "Nueva contrasena" y "Confirmar contrasena"
- Validacion cliente: ambos campos coinciden, minimo 6 caracteres
- Nuevo boton con icono `KeyRound` en la columna de acciones (junto a editar y eliminar)
- Funcion `handleChangePassword` que invoca la edge function

**3. Registrar la funcion en `supabase/config.toml`**

- Anadir entrada para `update-user-password` con `verify_jwt = true`

### Seguridad
- La validacion de rol admin se hace server-side en la edge function
- Se usa service role key solo en el servidor
- Validacion de longitud minima de contrasena tanto en cliente como en servidor
