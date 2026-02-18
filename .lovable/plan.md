

## Acceso diferenciado: NRRO ve todo, franquiciados solo lo asignado

### Problema actual
La base de datos (RLS) ya distingue correctamente entre usuarios NRRO y franquiciados para la tabla `restaurants`. Sin embargo, el codigo frontend (`useUserRestaurants`) siempre consulta solo la tabla `user_restaurants`, por lo que los usuarios NRRO solo ven los restaurantes que tienen explicitamente asignados en lugar de todos.

### Solucion

**1. Modificar `src/hooks/useUserRestaurants.ts`**

- Leer el `user_type` del perfil desde `AuthContext`
- Si `user_type === "nrro"`: consultar directamente `restaurants` (SELECT *) ya que RLS les permite ver todos
- Si `user_type === "franquiciado"`: mantener la consulta actual via `user_restaurants`

**2. Modificar `src/components/RestaurantSelector.tsx`**

- Anadir indicacion visual para usuarios NRRO de que ven todos los restaurantes
- Eliminar la opcion de "escribir manualmente" para NRRO ya que tienen acceso a la lista completa

**3. Modificar `src/pages/Restaurants.tsx`**

- Para usuarios NRRO: mostrar titulo "Todos los Restaurantes" en vez de "Mis Restaurantes"
- Ocultar el boton de "desasociar" para NRRO ya que no dependen de asignaciones
- Permitir a NRRO anadir restaurantes directamente sin crear asignacion en `user_restaurants`

### Detalle tecnico

```text
useUserRestaurants hook:
  if profile.user_type === "nrro"
    -> SELECT * FROM restaurants (RLS ya filtra)
  else
    -> SELECT via user_restaurants JOIN (logica actual)
```

No se necesitan cambios en la base de datos ni en las politicas RLS, ya que estas ya implementan la logica correcta. Solo hay que alinear el frontend con lo que la base de datos ya permite.
