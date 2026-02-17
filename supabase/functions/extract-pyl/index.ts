import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Eres un experto en extraer datos financieros de P&L de franquicias McDonald's. Analiza el documento y extrae los valores para las 43 líneas del formato PYL.

Los 43 valores son: Ventas Netas, Comida, Comida Empleados, Desperdicios, Papel, Total Coste Comida y Papel, RBE, Mano de Obra, Mano de Obra Gerencia, Seguridad Social, Gastos Viajes, Publicidad, Promoción, Servicios Exteriores, Uniformes, Suministros Operación, Reparación y Mantenimiento, Luz Agua Teléfono, Gastos Oficina, Diferencias Caja, Varios Controlables, Total Gastos Controlables, PAC, Renta, Renta Adicional, Royalti, Oficina/Legal, Seguros, Tasas y Licencias, Depreciaciones/Amortizaciones, Intereses, Varios, Total Gastos No Controlables, Ventas no Producto, Coste no Producto, Neto No Producto, SOI, Draw Salary, Gastos Generales, Resultado Neto, Cuota préstamo, Cash Flow, Inversiones Fondos Propios.

Si un valor no aparece en el documento, pon 0. Si no puedes detectar año, mes o código local, pon null.`;

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
        text: `Analiza este documento P&L y extrae los datos.`,
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
              description: "Extracts P&L data from a McDonald's franchise document into the 43-line PYL format.",
              parameters: {
                type: "object",
                properties: {
                  year: { type: ["string", "null"], description: "Year as 4-digit string, e.g. '2025', or null if not found" },
                  month: { type: ["string", "null"], description: "Month as 2-digit string, e.g. '01', or null if not found" },
                  localCode: { type: ["string", "null"], description: "Local/restaurant code, or null if not found" },
                  lines: {
                    type: "array",
                    items: { type: "number" },
                    minItems: 43,
                    maxItems: 43,
                    description: "Array of exactly 43 numbers representing each P&L line value",
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
