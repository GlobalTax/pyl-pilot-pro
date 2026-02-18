import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Eres un experto en contabilidad de franquicias McDonald's España. Tu tarea es extraer datos financieros de documentos P&L (Pérdidas y Ganancias) mensuales generados por el sistema corporativo (MCPRO u otros sistemas internos de McDonald's).

## Contexto del documento
- Son P&L mensuales de restaurantes McDonald's en España
- Formato típico: tabla con columnas "Concepto | Importe (€) | % sobre Ventas"
- Los importes están en EUROS (no en miles de euros)
- Formato numérico español: punto como separador de miles, coma como decimal (ej: 1.234,56 = 1234.56)
- DEBES convertir todos los importes al formato numérico estándar (sin separadores de miles, punto como decimal)

## Dónde encontrar metadatos
- **Código del restaurante**: busca "Rest.", "Restaurante", "Local", "Código", "Nº" seguido de un número (ej: "Rest. 1234", "Local 567")
- **Periodo**: busca "Mes:", "Periodo:", "Fecha:", una fecha en formato MM/AAAA, MM-AAAA, o el nombre del mes y año (ej: "Enero 2025", "01/2025")
- **Año**: extraer del periodo como string de 4 dígitos (ej: "2025")
- **Mes**: extraer del periodo como string de 2 dígitos (ej: "01" para enero)

## Las 43 líneas del P&L (índice 0-42)
Extrae los valores en este orden exacto. Se indican alias comunes entre paréntesis:

0. **Ventas Netas** (Ventas, Net Sales, Ingresos)
1. **Comida** (Food Cost, Coste de Comida, Materia Prima Comida)
2. **Comida Empleados** (Crew Food, Comida de Empleados, Comida Personal)
3. **Desperdicios** (Waste, Mermas)
4. **Papel** (Paper, Packaging, Envases, Material de Embalaje)
5. **Total Coste Comida y Papel** (Total Food & Paper, Total C&P) → TOTAL: suma de líneas 1+2+3+4
6. **RBE** (Resultado Bruto de Explotación, Gross Profit) → CALCULADO: línea 0 - línea 5
7. **Mano de Obra** (Crew Labor, Mano de Obra Crew, Salarios Crew)
8. **Mano de Obra Gerencia** (Management Labor, Salarios Gerencia, Mgmt Labor)
9. **Seguridad Social** (Payroll Taxes, Cargas Sociales, SS)
10. **Gastos Viajes** (Travel, Viajes y Desplazamientos)
11. **Publicidad** (Advertising, Marketing, Contribución Publicidad)
12. **Promoción** (Promotion, Gastos Promocionales)
13. **Servicios Exteriores** (Outside Services, Servicios Externos)
14. **Uniformes** (Uniforms, Vestuario)
15. **Suministros Operación** (Operating Supplies, Suministros)
16. **Reparación y Mantenimiento** (R&M, Repairs & Maintenance, Mantenimiento)
17. **Luz Agua Teléfono** (Utilities, Suministros Energéticos, Energía)
18. **Gastos Oficina** (Office Expenses, Material Oficina)
19. **Diferencias Caja** (Cash Over/Short, Diferencias de Caja)
20. **Varios Controlables** (Misc Controllable, Otros Controlables)
21. **Total Gastos Controlables** (Total Controllable Expenses) → TOTAL: suma de líneas 7 a 20
22. **PAC** (Profit After Controllables, Beneficio tras Controlables) → CALCULADO: línea 6 - línea 21
23. **Renta** (Rent, Alquiler Base, Base Rent)
24. **Renta Adicional** (Additional Rent, Percent Rent, Alquiler Variable)
25. **Royalti** (Royalty, Service Fee, Canon)
26. **Oficina/Legal** (Office/Legal, Gastos Legales, Asesoría)
27. **Seguros** (Insurance)
28. **Tasas y Licencias** (Taxes & Licenses, Impuestos y Licencias)
29. **Depreciaciones/Amortizaciones** (Depreciation, D&A, Amortización)
30. **Intereses** (Interest, Gastos Financieros)
31. **Varios** (Miscellaneous, Otros No Controlables)
32. **Total Gastos No Controlables** (Total Non-Controllable) → TOTAL: suma de líneas 23 a 31
33. **Ventas no Producto** (Non-Product Sales, Otros Ingresos)
34. **Coste no Producto** (Non-Product Cost, Coste Otros Ingresos)
35. **Neto No Producto** (Net Non-Product) → CALCULADO: línea 33 - línea 34
36. **SOI** (Store Operating Income, Resultado Operativo del Restaurante) → CALCULADO: línea 22 - línea 32 + línea 35
37. **Draw Salary** (Salario Franquiciado, Owner Draw)
38. **Gastos Generales** (G&A, General & Administrative, Gastos Administración)
39. **Resultado Neto** (Net Income, Beneficio Neto) → CALCULADO: línea 36 - línea 37 - línea 38
40. **Cuota préstamo** (Loan Payment, Cuota Financiación)
41. **Cash Flow** (Flujo de Caja) → CALCULADO: línea 39 - línea 40
42. **Inversiones Fondos Propios** (Own Fund Investments, Inversiones con Fondos Propios)

## Reglas importantes
1. Los importes negativos deben tener signo menos (ej: -1234.56)
2. Si un valor no aparece en el documento, pon 0
3. Las líneas de total (5, 6, 21, 22, 32, 35, 36, 39, 41) son calculadas; extrae el valor que aparezca en el documento
4. Devuelve siempre exactamente 43 valores numéricos en el array lines
5. Los valores deben estar en euros, no en miles de euros ni en porcentajes`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, mimeType } = await req.json();

    if (!fileBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ error: "fileBase64 and mimeType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userContent: any[] = [
      {
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${fileBase64}` },
      },
      {
        type: "text",
        text: `Analiza este documento P&L de McDonald's España. Extrae los 43 valores financieros en el orden especificado, convirtiendo el formato numérico español (1.234,56) a número estándar (1234.56). Localiza también el código del restaurante, el mes y el año del periodo.`,
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_pyl_data",
              description: "Extracts P&L data from a McDonald's Spain franchise document into the 43-line PYL format.",
              parameters: {
                type: "object",
                properties: {
                  year: { type: ["string", "null"], description: "Year as 4-digit string (e.g. '2025'), or null if not found" },
                  month: { type: ["string", "null"], description: "Month as 2-digit string (e.g. '01' for January), or null if not found" },
                  localCode: { type: ["string", "null"], description: "Restaurant/local code (e.g. '1234'), or null if not found" },
                  lines: {
                    type: "array",
                    items: { type: "number" },
                    minItems: 43,
                    maxItems: 43,
                    description: "Array of exactly 43 numbers in order: [0]Ventas Netas, [1]Comida, [2]Comida Empleados, [3]Desperdicios, [4]Papel, [5]Total Coste Comida y Papel, [6]RBE, [7]Mano de Obra, [8]Mano de Obra Gerencia, [9]Seguridad Social, [10]Gastos Viajes, [11]Publicidad, [12]Promoción, [13]Servicios Exteriores, [14]Uniformes, [15]Suministros Operación, [16]Reparación y Mantenimiento, [17]Luz Agua Teléfono, [18]Gastos Oficina, [19]Diferencias Caja, [20]Varios Controlables, [21]Total Gastos Controlables, [22]PAC, [23]Renta, [24]Renta Adicional, [25]Royalti, [26]Oficina/Legal, [27]Seguros, [28]Tasas y Licencias, [29]Depreciaciones/Amortizaciones, [30]Intereses, [31]Varios, [32]Total Gastos No Controlables, [33]Ventas no Producto, [34]Coste no Producto, [35]Neto No Producto, [36]SOI, [37]Draw Salary, [38]Gastos Generales, [39]Resultado Neto, [40]Cuota préstamo, [41]Cash Flow, [42]Inversiones Fondos Propios. All values in euros (not thousands). Use standard decimal format (1234.56, not 1.234,56).",
                  },
                },
                required: ["year", "month", "localCode", "lines"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_pyl_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Inténtalo de nuevo en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA agotados. Añade créditos en Configuración > Workspace > Uso." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No se recibió respuesta estructurada de la IA");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    // Validate lines array
    if (!Array.isArray(extracted.lines) || extracted.lines.length !== 43) {
      throw new Error(`Se esperaban 43 líneas, se recibieron ${extracted.lines?.length ?? 0}`);
    }

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-pyl error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
