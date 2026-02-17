

# Dashboard - Landing Page

## Resumen
Reemplazar el placeholder actual de `src/pages/Index.tsx` con un dashboard completo que sirva como landing de la app, incluyendo tarjetas de acceso rapido, actividad reciente en sesion, y seccion informativa sobre archivos .pyl.

---

## Cambios en archivos

### 1. `src/pages/Index.tsx` - Reescritura completa

**Estructura:**

1. **Cabecera** con saludo "Bienvenido a PYL Manager" y subtitulo "Herramienta de gestion de P&L para franquicias".

2. **Grid 2x2 de tarjetas** de acceso rapido usando `Card` + `Link` de react-router-dom:
   - "Convertir a PYL" con icono `FileUp`, enlace a `/convertir`
   - "Visor P&L" con icono `Eye`, enlace a `/visor`
   - "Descargar Plantilla" con icono `Download`, enlace a `/plantilla`
   - "Ayuda" con icono `HelpCircle`, enlace a `/ayuda` (ruta placeholder)
   - Cada tarjeta con efecto hover sutil (`hover:shadow-md hover:-translate-y-0.5 transition-all`)

3. **Seccion "Actividad reciente":**
   - Estado React en memoria (`useState<ActivityItem[]>([])`) -- no localStorage.
   - Muestra los ultimos archivos .pyl generados en la sesion (nombre, fecha, local).
   - Si no hay actividad: mensaje "No hay actividad reciente en esta sesion".
   - Nota: como el estado es local al componente y no hay un contexto global de actividad implementado, esta seccion mostrara siempre el mensaje vacio. Se prepara la estructura para integracion futura con un contexto o store.

4. **Seccion informativa "Que es un archivo .pyl?":**
   - Explicacion breve en 2 lineas.
   - Boton/link "Ver mapeo completo" que abre un `Dialog` con una tabla de las 43 lineas PYL (importando `PYL_LINE_MAP` de `src/lib/pyl.ts`).

### 2. `src/App.tsx` - Agregar ruta placeholder `/ayuda`

- Agregar ruta `/ayuda` con un componente placeholder inline similar al Index original (tarjeta con mensaje "Proximamente").

---

## Detalles tecnicos

- Iconos de Lucide: `FileUp`, `Eye`, `Download`, `HelpCircle`, `Clock`, `Info`.
- Componentes UI reutilizados: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`.
- `PYL_LINE_MAP` se importa para popular la tabla del modal.
- Las tarjetas de navegacion usan `Link` de react-router-dom envuelto en `Card`.
- Interfaz `ActivityItem`: `{ name: string; date: string; localCode: string }`.
- No se crean archivos nuevos aparte de la modificacion de los dos existentes.

