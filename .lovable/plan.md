

## Admins siempre ven todos los restaurantes

### Situacion actual
- Samuel (s.navarro@obn.es) es admin pero tiene `user_type = franquiciado`, por lo que el hook `useUserRestaurants` solo le muestra restaurantes asignados.
- José María y Samuel (s.navarro@nrro.es) ya son admin + nrro, asi que ya ven todo.
- Los tres ya tienen rol `admin` en la base de datos, no hay que cambiar nada ahi.

### Cambio necesario

**Modificar `src/hooks/useUserRestaurants.ts`:**
- Anadir `isAdmin` desde `useAuth()`
- Si el usuario es admin O es nrro, consultar directamente la tabla `restaurants` (todos los restaurantes)
- Solo los franquiciados no-admin usan la consulta via `user_restaurants`

```text
Logica actual:        nrro → todos | franquiciado → asignados
Logica nueva:   admin O nrro → todos | franquiciado → asignados
```

**Modificar `src/pages/Restaurants.tsx`:**
- Actualizar la logica de titulo y botones para considerar tambien `isAdmin` (no solo `isNrro`)

### Sobre "super admin"
Samuel y José María ya son administradores en el sistema. No se necesita crear un nuevo rol; simplemente se ajusta el frontend para que los admins siempre vean todos los restaurantes.

