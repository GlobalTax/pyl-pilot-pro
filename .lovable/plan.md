

## Gestion de Restaurantes (Sites/Locales)

### 1. Base de datos (2 migraciones SQL)

**Tabla `restaurants`:**
- `id` uuid PK default gen_random_uuid()
- `code` text UNIQUE NOT NULL
- `name` text NOT NULL
- `address` text nullable
- `city` text nullable
- `created_at` timestamptz default now()

**RLS en `restaurants`:**
- SELECT para admins: `has_role(auth.uid(), 'admin')` 
- SELECT para usuarios: existe fila en `user_restaurants` con su `user_id`
- INSERT para authenticated (cualquier usuario logueado puede crear un restaurante)
- UPDATE para admins (gestion completa)
- UPDATE para usuarios propios (solo si tienen asignacion)

**Tabla `user_restaurants`:**
- `id` uuid PK default gen_random_uuid()
- `user_id` uuid FK a profiles.id ON DELETE CASCADE NOT NULL
- `restaurant_id` uuid FK a restaurants.id ON DELETE CASCADE NOT NULL  
- `created_at` timestamptz default now()
- UNIQUE(user_id, restaurant_id)

**RLS en `user_restaurants`:**
- SELECT/INSERT/DELETE para admins: `has_role(auth.uid(), 'admin')`
- SELECT para usuarios: `user_id = auth.uid()`
- INSERT para usuarios: `user_id = auth.uid()`
- DELETE para usuarios: `user_id = auth.uid()`

### 2. Nueva pagina "Mis Restaurantes" (`src/pages/Restaurants.tsx`)

- Ruta: `/restaurants`
- Usa un hook custom `useUserRestaurants` que consulta restaurants JOIN user_restaurants
- Lista en cards/tabla: codigo, nombre, direccion, ciudad
- Boton "Anadir restaurante" abre Dialog con formulario:
  - Codigo (obligatorio), Nombre (obligatorio), Direccion (opcional), Ciudad (opcional)
  - Logica: primero busca si el codigo ya existe en `restaurants`. Si existe, solo inserta en `user_restaurants`. Si no, crea el restaurante y luego la asignacion.
- Boton editar por restaurante (edita nombre/direccion/ciudad)
- Boton eliminar: solo borra la fila de `user_restaurants` (desasocia)

### 3. Hook reutilizable (`src/hooks/useUserRestaurants.ts`)

- Query con react-query que trae los restaurantes del usuario logueado
- Devuelve `{ restaurants, loading, refetch }`
- Reutilizable en Restaurants, Convertir y Visor

### 4. Panel Admin - Pestanas reorganizadas (`src/pages/Admin.tsx`)

Reorganizar con Tabs de nivel superior:
- **Usuarios**: la tabla actual de aprobacion/rechazo, anadiendo columna "Restaurantes asignados" (badges con codigos)
- **Restaurantes**: tabla con todos los restaurantes (codigo, nombre, ciudad, numero de usuarios asignados)
  - Boton "Crear restaurante" (sin asignar a nadie)
  - Por cada restaurante: boton "Gestionar usuarios" que abre Dialog con:
    - Lista de usuarios asignados con boton quitar
    - Select/buscador de usuarios aprobados para asignar nuevos

### 5. Sidebar y BottomNav

- Anadir enlace "Mis Restaurantes" con icono `Store` de Lucide
- Posicion: entre Dashboard y Convertir a PYL
- En ambos: `AppSidebar.tsx` y `BottomNav.tsx`

### 6. Selector de local en Convertir (`src/pages/Convertir.tsx`)

En las 3 pestanas (Excel, PDF, Manual), reemplazar el `<Input>` de "Codigo Local" por un componente `RestaurantSelector`:
- Dropdown con los restaurantes del usuario: formato "codigo -- nombre"
- Al seleccionar, setea el localCode correspondiente
- Si no tiene restaurantes: mensaje con link a /restaurants
- Opcion de escribir manualmente con texto helper: "No aparece tu local? Escribelo manualmente o anadelo en Mis Restaurantes"
- Componente extraido a `src/components/RestaurantSelector.tsx`

### 7. Visor P&L - Nombre del restaurante (`src/pages/Visor.tsx`)

- Al cargar un .pyl, buscar en los restaurantes del usuario si el `localCode` del archivo coincide con algun `code`
- Si coincide, mostrar en la cabecera: "Site 289 -- Diagonal Mar" en vez de solo "Site 289"

### 8. Routing (`src/App.tsx`)

- Anadir ruta `/restaurants` protegida dentro del ProtectedRoute + AppLayout

---

### Detalles tecnicos

**Migracion SQL:**

```text
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  address text,
  city text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, restaurant_id)
);

ALTER TABLE public.user_restaurants ENABLE ROW LEVEL SECURITY;

-- RLS restaurants
CREATE POLICY "Admins can do everything on restaurants"
  ON public.restaurants FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view assigned restaurants"
  ON public.restaurants FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_restaurants
    WHERE restaurant_id = restaurants.id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert restaurants"
  ON public.restaurants FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update assigned restaurants"
  ON public.restaurants FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_restaurants
    WHERE restaurant_id = restaurants.id AND user_id = auth.uid()
  ));

-- RLS user_restaurants
CREATE POLICY "Admins can manage all assignments"
  ON public.user_restaurants FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own assignments"
  ON public.user_restaurants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own assignments"
  ON public.user_restaurants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own assignments"
  ON public.user_restaurants FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

**Archivos a crear:**
- `src/pages/Restaurants.tsx` -- pagina Mis Restaurantes
- `src/hooks/useUserRestaurants.ts` -- hook reutilizable
- `src/components/RestaurantSelector.tsx` -- selector dropdown

**Archivos a modificar:**
- `src/App.tsx` -- anadir ruta /restaurants
- `src/components/AppSidebar.tsx` -- anadir enlace Store
- `src/components/BottomNav.tsx` -- anadir enlace Store
- `src/pages/Convertir.tsx` -- reemplazar inputs de codigo local por RestaurantSelector
- `src/pages/Visor.tsx` -- mostrar nombre del restaurante en cabecera
- `src/pages/Admin.tsx` -- reorganizar con pestanas Usuarios/Restaurantes y gestion de asignaciones

