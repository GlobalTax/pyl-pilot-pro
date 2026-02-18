import { HelpCircle, FileUp, Eye, Download, FileText, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const steps = [
  {
    icon: FileUp,
    title: "1. Convertir a PYL",
    desc: "Transforma tu P&L en formato .pyl",
    items: [
      "Ve a la sección «Convertir a PYL» desde el menú lateral o el Dashboard.",
      "Elige una de las tres pestañas: Excel, PDF/Imagen o Manual.",
      "Excel: arrastra tu archivo .xlsx con el P&L. Los valores se detectan automáticamente.",
      "PDF/Imagen: sube un PDF o captura y la IA extraerá los datos.",
      "Manual: introduce los valores línea a línea. Los totales se calculan solos.",
      "Completa Año, Mes y Código de Local.",
      "Pulsa «Generar .pyl» para descargar el archivo.",
    ],
  },
  {
    icon: Eye,
    title: "2. Visor P&L",
    desc: "Visualiza un archivo .pyl como reporte profesional",
    items: [
      "Ve a «Visor P&L» desde el menú o el Dashboard.",
      "Arrastra o selecciona un archivo .pyl.",
      "Se mostrará el P&L formateado con cabecera, tabla y KPIs.",
      "Los totales aparecen destacados en azul y los negativos en rojo.",
      "Usa «Exportar PDF» para guardar el reporte o «Descargar .pyl» para obtener el archivo.",
    ],
  },
  {
    icon: Download,
    title: "3. Descargar Plantilla",
    desc: "Obtén la plantilla Excel oficial",
    items: [
      "Ve a «Descargar Plantilla» desde el menú o el Dashboard.",
      "Pulsa el botón de descarga para obtener el archivo .xlsx.",
      "Rellena la plantilla con los datos de tu restaurante.",
      "Luego usa «Convertir a PYL» (pestaña Excel) para generar el .pyl.",
    ],
  },
];

const faqs = [
  {
    q: "¿Qué es un archivo .pyl?",
    a: "Es un formato de texto plano que contiene las 43 líneas del P&L (Profit & Loss) de un restaurante, con datos de año, mes, código de local e importe por línea. Es el formato estándar para reportar resultados financieros.",
  },
  {
    q: "¿Qué formatos de Excel son compatibles?",
    a: "Se aceptan archivos .xlsx y .xls. La plantilla oficial facilita la detección automática de todas las líneas, pero también se soportan otros formatos de P&L.",
  },
  {
    q: "¿Cómo funciona la extracción por IA desde PDF/Imagen?",
    a: "Al subir un PDF o imagen (PNG/JPG), la IA analiza el contenido y extrae los valores de las 43 líneas del P&L. Después puedes revisar y corregir cualquier valor antes de generar el .pyl.",
  },
  {
    q: "¿Se guardan mis datos en algún servidor?",
    a: "No. Todo el procesamiento de archivos Excel y .pyl se realiza localmente en tu navegador. Solo la extracción por IA (PDF/Imagen) envía el archivo al servidor para su análisis, pero no se almacena.",
  },
  {
    q: "¿Qué son las líneas de tipo «total»?",
    a: "Son líneas calculadas automáticamente a partir de otras (ej: L06 = suma de costes, L07 = ventas − costes). No necesitas introducirlas manualmente; se calculan solas.",
  },
  {
    q: "¿Puedo editar los valores después de importar?",
    a: "Sí. Tanto en la pestaña Excel como en PDF/Imagen, puedes modificar cualquier valor en la tabla de previsualización antes de generar el archivo .pyl.",
  },
  {
    q: "¿Qué significa el porcentaje «% s/ Ventas» en el Visor?",
    a: "Cada línea se expresa como porcentaje sobre las Ventas Netas (Línea 01). Esto permite comparar la estructura de costes entre diferentes periodos o locales.",
  },
];

const Ayuda = () => (
  <div className="max-w-3xl mx-auto space-y-8">
    {/* Header */}
    <div className="flex items-center gap-3">
      <div className="rounded-full bg-primary/10 p-2.5">
        <HelpCircle className="text-primary" size={24} />
      </div>
      <div>
        <h1 className="text-2xl font-medium text-foreground">Ayuda</h1>
        <p className="text-sm text-muted-foreground">Guía de uso y preguntas frecuentes</p>
      </div>
    </div>

    {/* Step-by-step guide */}
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
        <FileText size={18} className="text-muted-foreground" />
        Guía paso a paso
      </h2>

      {steps.map((s) => (
        <Card key={s.title}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-primary/10 p-2">
                <s.icon className="text-primary" size={20} />
              </div>
              <div>
                <CardTitle className="text-base">{s.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {s.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ChevronRight size={14} className="mt-0.5 shrink-0 text-primary/60" />
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ))}
    </section>

    {/* FAQ */}
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
        <HelpCircle size={18} className="text-muted-foreground" />
        Preguntas frecuentes
      </h2>

      <Card>
        <CardContent className="pt-6">
          <Accordion type="multiple" className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </section>
  </div>
);

export default Ayuda;
