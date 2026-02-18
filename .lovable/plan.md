

## Promover a Samuel (s.navarro@obn.es) a Admin

Se realizaran dos operaciones en la base de datos:

1. **Actualizar el perfil**: Cambiar `status` de `pending` a `approved` en la tabla `profiles`
2. **Asignar rol admin**: Actualizar el rol existente de `user` a `admin` en la tabla `user_roles`

**Usuario encontrado:**
- ID: `d38fd7c8-e198-4270-9623-190c06175377`
- Nombre: Samuel
- Email: s.navarro@obn.es
- Estado actual: pending
- Rol actual: user

### Operaciones SQL a ejecutar

```text
UPDATE profiles SET status = 'approved' WHERE id = 'd38fd7c8-...';
INSERT INTO user_roles (user_id, role) VALUES ('d38fd7c8-...', 'admin');
```

Esto le dara acceso completo a la app incluyendo el panel de administracion.

