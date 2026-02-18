

## Crear usuarios desde el panel Admin

### Resumen
Agregar un boton "Crear usuario" en la pestana Usuarios del panel Admin que permita al administrador registrar nuevos usuarios directamente, sin que estos tengan que pasar por el formulario de registro ni confirmar email.

### Flujo
1. Admin hace clic en "Crear usuario" en la pestana Usuarios
2. Se abre un modal con campos: Nombre, Empresa, Email, Contrasena
3. Al confirmar, se llama a una funcion backend que crea el usuario con email ya confirmado y estado "approved"
4. El usuario aparece inmediatamente en la tabla como aprobado y listo para iniciar sesion

### Cambios necesarios

**1. Nueva funcion backend `create-user`**
- Archivo: `supabase/functions/create-user/index.ts`
- Verifica que quien llama es admin (consultando `user_roles`)
- Usa el cliente admin (service role) para crear el usuario con `auth.admin.createUser()` con `email_confirm: true`
- El trigger existente `handle_new_user` creara automaticamente el perfil con estado "pending" y rol "user"
- Despues de crear, actualiza el perfil a status "approved"
- Devuelve los datos del usuario creado

**2. Configuracion en `supabase/config.toml`**
- Anadir la funcion `create-user` con `verify_jwt = false` (la autorizacion se valida dentro de la funcion)

**3. Modificar `src/pages/Admin.tsx`**
- Anadir boton "Crear usuario" junto a los filtros en la pestana Usuarios
- Nuevo Dialog con formulario: nombre, empresa, email, contrasena
- Al enviar, llamar a la funcion backend via `supabase.functions.invoke("create-user", ...)`
- Al completar, refrescar la lista de usuarios

### Detalles tecnicos

**Edge function `create-user`:**
- Recibe: `{ email, password, full_name, company }`
- Valida token JWT del llamador y verifica rol admin
- Llama a `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, company } })`
- Actualiza `profiles.status = 'approved'` para el nuevo usuario
- Retorna `{ user_id, email }`

**Archivos a crear:**
- `supabase/functions/create-user/index.ts`

**Archivos a modificar:**
- `supabase/config.toml` -- anadir configuracion de la funcion
- `src/pages/Admin.tsx` -- anadir boton y modal de creacion de usuario

