

## Cambio de tipografia y look & feel estilo Apollo

### Tipografia

Se copiaran las dos fuentes subidas al proyecto y se configuraran como `@font-face` en el CSS:

- **General Sans Light** (peso 300): para body text, descripciones, labels
- **General Sans Medium** (peso 500): para titulos, headings, botones, nav items

Se eliminara la importacion de Google Fonts (Inter) y se reemplazara por las fuentes locales.

### Look & feel estilo Apollo

Basandome en la captura de Apollo, los cambios principales en la paleta de colores y estilo seran:

**Colores (modo claro):**
- Background: blanco puro (#FFFFFF) en lugar del gris claro actual
- Cards: blanco con bordes sutiles gris claro
- Sidebar: fondo blanco/muy claro (como Apollo) en lugar del azul oscuro actual
- Sidebar items activos: fondo gris claro con texto oscuro (en vez de verde sobre azul)
- Primary: azul oscuro corporativo (similar al actual pero mas neutro)
- Accent/secondary: un amarillo/dorado sutil como Apollo usa para badges
- Bordes: gris muy claro y fino
- Foreground: gris oscuro (#1a1a2e) para texto principal

**Sidebar:**
- Fondo claro (blanco o gris muy palido) con borde derecho gris claro
- Texto oscuro en items de navegacion
- Item activo con fondo gris claro y borde izquierdo o texto en negrita
- Sin el aspecto "dark sidebar" actual

**Componentes generales:**
- Cards con sombra minima o sin sombra, solo borde
- Border radius mas suave
- Espaciado limpio y profesional
- Badges con fondo de color suave (como los tags de Apollo)

### Archivos a modificar

1. **`public/fonts/GeneralSans-Light.otf`** y **`public/fonts/GeneralSans-Medium.otf`** - Copiar fuentes al proyecto
2. **`src/index.css`** - Reemplazar importacion de Inter por `@font-face` de General Sans; actualizar variables CSS de colores para el estilo Apollo (sidebar claro, fondo blanco, bordes sutiles)
3. **`tailwind.config.ts`** - Agregar la familia `sans` con General Sans como fuente principal
4. **`src/components/AppHeader.tsx`** - Adaptar header al estilo Apollo (mas limpio, fondo blanco)
5. **`src/components/AppSidebar.tsx`** - Sidebar con fondo claro, items con estilo Apollo
6. **`src/components/BottomNav.tsx`** - Adaptar navegacion movil al nuevo estilo claro

### Detalle tecnico

**CSS variables actualizadas (modo claro):**
```text
--background:       0 0% 100%       (blanco puro)
--card:             0 0% 100%       (blanco)
--border:           220 13% 91%     (gris muy claro)
--primary:          220 40% 25%     (azul corporativo oscuro)
--secondary:        38 80% 55%      (dorado/ambar Apollo)
--muted:            220 14% 96%     (gris palido)
--sidebar-background: 0 0% 100%    (blanco)
--sidebar-foreground: 220 20% 30%  (texto oscuro)
--sidebar-accent:   220 14% 96%    (gris hover)
--sidebar-border:   220 13% 91%    (borde sutil)
```

**Font-face declarations:**
```text
@font-face General Sans Light -> weight 300
@font-face General Sans Medium -> weight 500
body: font-weight 300
h1-h6, strong, .font-bold/semibold/medium: font-weight 500
```

