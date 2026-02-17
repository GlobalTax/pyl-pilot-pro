

# PYL Manager — Plan de Implementación

## Resumen
Aplicación de gestión para clientes de la asesoría fiscal NRRO que operan franquicias McDonald's. Esta fase cubre únicamente la **estructura de navegación y layout visual** sin lógica de negocio.

---

## 1. Tema y Diseño Visual
- Paleta corporativa: azul oscuro (#1B3A5C), teal (#2A9D8F), blanco
- Tipografía Inter (sans-serif profesional)
- Variables CSS personalizadas para el tema (primary = azul oscuro, accent = teal)
- Aspecto limpio y profesional, con bordes suaves y espaciado generoso

## 2. Layout Principal
- **Header fijo** con logo texto "PYL Manager" y subtítulo "NRRO" a la derecha o debajo
- **Sidebar izquierdo colapsable** (ancho completo ↔ solo iconos)
- **Área de contenido principal** que ocupa el resto del espacio

## 3. Sidebar con Navegación
Cuatro secciones con iconos Lucide:
| Ruta | Icono | Etiqueta |
|------|-------|----------|
| `/` | LayoutDashboard | Dashboard |
| `/convertir` | FileOutput | Convertir a PYL |
| `/visor` | FileSearch | Visor P&L |
| `/plantilla` | Download | Descargar plantilla |

- Resaltado visual de la ruta activa
- Botón para colapsar/expandir el sidebar
- En modo colapsado se muestran solo los iconos

## 4. Responsive (Móvil)
- En pantallas pequeñas el sidebar desaparece y se muestra una **barra de navegación inferior (bottom nav)** con los 4 iconos
- El header se simplifica manteniendo el nombre de la app

## 5. Páginas Placeholder
Cada ruta mostrará una tarjeta centrada con el título de la sección y un mensaje indicando que la funcionalidad se implementará próximamente:
- **Dashboard**: "Resumen de actividad" (placeholder)
- **Convertir a PYL**: "Conversión de P&L a formato .pyl" (placeholder)
- **Visor P&L**: "Visualización de archivos .pyl" (placeholder)
- **Descargar plantilla**: "Descarga de plantilla Excel" (placeholder)

