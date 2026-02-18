

## Reducir el peso de los títulos

### Problema
Los títulos usan clases `font-bold` (700) y `font-semibold` (600), pero la fuente General Sans solo tiene dos pesos: Light (300) y Medium (500). Como no existen los pesos 600/700 en la fuente, el navegador intenta sintetizarlos artificialmente, lo que produce un aspecto demasiado grueso y poco natural.

### Solucion
Reemplazar todas las ocurrencias de `font-bold` y `font-semibold` por `font-medium` (500) en los componentes de la aplicacion, para que coincidan con el peso real disponible en General Sans Medium.

### Archivos a modificar

**Paginas (titulos y textos destacados):**
- `src/pages/Index.tsx` - h1 "Bienvenido a PYL Manager" y otros titulos
- `src/pages/Convertir.tsx` - h1, filas de totales en tablas, lineas de validacion
- `src/pages/Ayuda.tsx` - h1, h2 de secciones
- `src/pages/Plantilla.tsx` - titulos de pagina
- `src/pages/Visor.tsx` - titulos de pagina
- `src/pages/NotFound.tsx` - titulo 404

**Componentes UI (valores por defecto):**
- `src/components/ui/card.tsx` - CardTitle
- `src/components/ui/dialog.tsx` - DialogTitle
- `src/components/ui/drawer.tsx` - DrawerTitle
- `src/components/ui/sheet.tsx` - SheetTitle
- `src/components/ui/toast.tsx` - ToastTitle
- `src/components/ui/menubar.tsx` - MenubarLabel
- `src/components/ui/dropdown-menu.tsx` - DropdownMenuLabel
- `src/components/ui/context-menu.tsx` - ContextMenuLabel

### Cambio tecnico
En todos los archivos listados:
- `font-bold` pasa a `font-medium`
- `font-semibold` pasa a `font-medium`

Esto asegura que todo el texto destacado use el peso 500 (General Sans Medium) que es el unico peso "grueso" disponible en la fuente.
