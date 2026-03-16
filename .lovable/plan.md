

## Sistema de Historial de archivos PYL

### Resumen

Implementar un sistema completo de persistencia de archivos .pyl generados, con historial consultable, integracion en el visor y dashboard, y vista global para administradores.

---

### 1. Nueva tabla `pyl_files` en la base de datos

**Columnas:**
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, NOT NULL) -- quien lo genero
- `restaurant_id` (uuid, nullable, FK a restaurants.id) -- asociado automaticamente si coincide
- `local_code` (text, NOT NULL)
- `year` (text, NOT NULL)
- `month` (text, NOT NULL)
- `filename` (text, NOT NULL)
- `content` (text, NOT NULL) -- las 43 lineas en formato PYL
- `lines_json` (jsonb, NOT NULL) -- array de 43 valores numericos
- `source` (text, NOT NULL) -- "excel" | "pdf_image" | "manual"
- `created_at` (timestamptz, default now())

**Constraints:**
- UNIQUE en (local_code, year, month) -- un PYL por local/mes

**Politicas RLS:**
- Usuarios ven solo sus PYLs (`user_id = auth.uid()`)
- Admins ven todos (`has_role(auth.uid(), 'admin')`)
- Usuarios pueden insertar sus propios PYLs (`user_id = auth.uid()`)
- Usuarios pueden actualizar sus propios PYLs (para sobrescritura)
- Usuarios pueden eliminar sus propios PYLs
- Admins pueden hacer todo

---

### 2. Guardado automatico al generar (Convertir.tsx)

Modificar las tres funciones de generacion: `handleGenerate` (Excel), `handlePdfGenerate` (PDF/IA), `handleManualGenerate` (Manual).

**Logica comun (nueva funcion `savePylToHistory`):**
1. Generar el contenido PYL y el array de 43 valores
2. Buscar si el `local_code` coincide con un restaurante del usuario para obtener `restaurant_id`
3. Comprobar si ya existe un registro con (local_code, year, month) en `pyl_files`
4. Si existe: mostrar modal de confirmacion "Ya existe un PYL para Local [codigo] -- [mes]/[year]. Sobrescribir?"
   - Si acepta: UPDATE del registro existente
   - Si cancela: solo descargar sin guardar
5. Si no existe: INSERT nuevo registro
6. En ambos casos: descargar el archivo .pyl
7. Mostrar toast "PYL guardado correctamente" o "PYL descargado (no guardado)" segun corresponda
8. Si falla el guardado: descargar igualmente y mostrar aviso

**Nuevo estado necesario en Convertir.tsx:**
- `overwriteOpen` (boolean) -- modal de confirmacion
- `pendingSave` -- datos pendientes de guardar

---

### 3. Nueva pagina Historial (/history)

**Archivo: `src/pages/History.tsx`**

Tabla con todos los PYLs del usuario:
- **Columnas:** Local (codigo + nombre si existe), Periodo (Mes/Ano), Origen (icono segun source: Excel/IA/Manual), Fecha de creacion
- **Ordenado** por fecha descendente
- **Filtros:** por restaurante (dropdown con los del usuario), por ano, por origen
- **Acciones por fila:**
  - Descargar .pyl (regenera desde `content`)
  - Ver en Visor P&L (navega a /visor con query param o state para precargar datos)
  - Eliminar (con AlertDialog de confirmacion)
- **Estado vacio:** "No has generado ningun PYL todavia" con enlace a /convertir

**Navegacion:**
- Sidebar (`AppSidebar.tsx`): nuevo item con icono `History` despues de "Visor P&L"
- Bottom nav (`BottomNav.tsx`): anadir "Historial"
- Router (`App.tsx`): nueva ruta `/history`

---

### 4. Panel admin -- Historial global

**Modificar: `src/pages/Admin.tsx`**

Nueva pestana "Historial" en el TabsList existente (junto a Usuarios y Restaurantes):
- Misma tabla que History.tsx pero con datos de todos los usuarios
- Columna adicional: Usuario (nombre + empresa)
- Filtro adicional por usuario/empresa
- Indicador visual: lista de restaurantes que NO tienen PYL del mes actual (seccion "pendientes")

---

### 5. Dashboard actualizado (Index.tsx)

**Modificar: `src/pages/Index.tsx`**

- Reemplazar la seccion de "Actividad reciente" basada en ActivityContext por una consulta a `pyl_files`
- Mostrar los ultimos 5 PYLs generados por el usuario (consulta a Supabase)
- Cada item es clickable y navega a /visor con los datos precargados
- Se mantiene el ActivityContext como fallback durante la sesion si el usuario no tiene PYLs guardados aun

---

### 6. Visor P&L actualizado (Visor.tsx)

**Modificar: `src/pages/Visor.tsx`**

- Anadir dropdown/select "Cargar desde historial" antes de la zona de subida de archivo
- Consulta los PYLs del usuario desde `pyl_files`
- Formato de opciones: "Local codigo -- nombre | Mes/Ano"
- Al seleccionar: parsea el `content` del PYL y lo carga directamente (mismo flujo que subir archivo)
- Tambien aceptar datos precargados via location.state (para navegacion desde Dashboard/Historial)

---

### Detalle tecnico

**Archivos nuevos:**
- `src/pages/History.tsx` -- pagina de historial
- `src/hooks/usePylHistory.ts` -- hook con queries a pyl_files (lista, delete, check existente)

**Archivos modificados:**
- `src/pages/Convertir.tsx` -- guardado automatico + modal sobrescritura
- `src/pages/Visor.tsx` -- dropdown historial + carga via state
- `src/pages/Index.tsx` -- actividad desde DB
- `src/pages/Admin.tsx` -- nueva pestana historial
- `src/components/AppSidebar.tsx` -- nuevo enlace Historial
- `src/components/BottomNav.tsx` -- nuevo enlace Historial
- `src/App.tsx` -- nueva ruta /history

**Migracion SQL:**

```text
CREATE TABLE pyl_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE SET NULL,
  local_code text NOT NULL,
  year text NOT NULL,
  month text NOT NULL,
  filename text NOT NULL,
  content text NOT NULL,
  lines_json jsonb NOT NULL DEFAULT '[]',
  source text NOT NULL DEFAULT 'excel',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(local_code, year, month)
);

ALTER TABLE pyl_files ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own pyl_files" ON pyl_files FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all pyl_files" ON pyl_files FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own pyl_files" ON pyl_files FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own pyl_files" ON pyl_files FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own pyl_files" ON pyl_files FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Admins can do everything on pyl_files" ON pyl_files FOR ALL USING (has_role(auth.uid(), 'admin'));
```

**Orden de implementacion:**
1. Crear tabla y RLS (migracion)
2. Hook `usePylHistory`
3. Modificar `Convertir.tsx` (guardado + modal)
4. Crear `History.tsx` + rutas + sidebar
5. Modificar `Visor.tsx` (dropdown + state)
6. Modificar `Index.tsx` (actividad desde DB)
7. Modificar `Admin.tsx` (pestana historial)

