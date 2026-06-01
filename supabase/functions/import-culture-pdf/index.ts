import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedCultureCode {
  missao: {
    statement: string;
  };
  visao: {
    statement: string;
    horizon?: string;
  };
  valores: {
    values: Array<{
      label: string;
      mantra?: string;
      dos: string[];
      donts: string[];
    }>;
  };
  indicadores: {
    financeira: string[];
    clientes: string[];
    processos: string[];
    aprendizado: string[];
  };
  projetos: Array<{
    name: string;
    perspective: string;
    importance?: string;
  }>;
  energia: {
    items: string[];
  };
  desenvolvimento: {
    items: string[];
  };
  decisao: {
    guidelines: string[];
    summary?: string;
  };
}

async function extractCultureFromPDF(pdfBase64: string): Promise<ExtractedCultureCode> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const systemPrompt = `Você é um especialista em análise de documentos de Código de Cultura organizacional.
Sua tarefa é extrair informações estruturadas de um PDF de Código de Cultura e retornar um JSON estruturado.

O Código de Cultura geralmente contém 8 pilares:
1. MISSÃO - A razão de existir da empresa (uma frase curta)
2. VISÃO - Onde a empresa quer chegar no futuro (pode incluir horizonte temporal)
3. VALORES - Princípios fundamentais com comportamentos DO (fazer) e DON'T (não fazer)
4. INDICADORES ESTRATÉGICOS - Métricas nas 4 perspectivas do BSC (Financeira, Clientes, Processos, Aprendizado)
5. PROJETOS ESTRATÉGICOS - Iniciativas prioritárias
6. ENERGIA - Práticas de engajamento e motivação
7. DESENVOLVIMENTO - Práticas de crescimento e aprendizado
8. TOMADA DE DECISÃO - Diretrizes para decisões

Extraia as informações e retorne APENAS um JSON válido no formato especificado.`;

  const userPrompt = `Analise este PDF de Código de Cultura e extraia as informações para cada pilar.

Retorne um JSON com esta estrutura exata:
{
  "missao": {
    "statement": "texto da missão"
  },
  "visao": {
    "statement": "texto da visão",
    "horizon": "horizonte temporal se mencionado (ex: 2030)"
  },
  "valores": {
    "values": [
      {
        "label": "nome do valor",
        "mantra": "frase curta do valor se houver",
        "dos": ["comportamento esperado 1", "comportamento esperado 2"],
        "donts": ["comportamento a evitar 1", "comportamento a evitar 2"]
      }
    ]
  },
  "indicadores": {
    "financeira": ["indicador 1", "indicador 2"],
    "clientes": ["indicador 1", "indicador 2"],
    "processos": ["indicador 1", "indicador 2"],
    "aprendizado": ["indicador 1", "indicador 2"]
  },
  "projetos": [
    {
      "name": "nome do projeto",
      "perspective": "financeira|clientes|processos|aprendizado",
      "importance": "descrição da importância"
    }
  ],
  "energia": {
    "items": ["prática de energia 1", "prática de energia 2"]
  },
  "desenvolvimento": {
    "items": ["prática de desenvolvimento 1", "prática de desenvolvimento 2"]
  },
  "decisao": {
    "guidelines": ["diretriz 1", "diretriz 2"],
    "summary": "resumo geral das diretrizes se houver"
  }
}

Se algum pilar não estiver presente no documento, deixe arrays vazios ou strings vazias.
Retorne APENAS o JSON, sem markdown ou explicações.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI Gateway error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("Payment required. Please add funds to your workspace.");
    }
    throw new Error(`AI extraction failed: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content returned from AI");
  }

  // Clean up the response (remove markdown code blocks if present)
  let jsonString = content.trim();
  if (jsonString.startsWith("```json")) {
    jsonString = jsonString.slice(7);
  }
  if (jsonString.startsWith("```")) {
    jsonString = jsonString.slice(3);
  }
  if (jsonString.endsWith("```")) {
    jsonString = jsonString.slice(0, -3);
  }
  jsonString = jsonString.trim();

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse AI response:", jsonString);
    throw new Error("Failed to parse extracted data");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveCultureData(
  supabase: any,
  accountId: string,
  userId: string,
  data: ExtractedCultureCode
) {
  const results: Record<string, boolean> = {};

  // 1. Save Mission
  if (data.missao?.statement) {
    try {
      const { data: existingMission } = await supabase
        .from("mission_sessions")
        .select("id")
        .eq("account_id", accountId)
        .maybeSingle();

      const missionAnalysis = {
        finalMission: data.missao.statement,
      };

      if (existingMission) {
        await supabase
          .from("mission_sessions")
          .update({ analysis: missionAnalysis, stage: 16 })
          .eq("id", existingMission.id);
      } else {
        await supabase.from("mission_sessions").insert({
          account_id: accountId,
          user_id: userId,
          analysis: missionAnalysis,
          stage: 16,
        });
      }
      results.missao = true;
    } catch (e) {
      console.error("Error saving mission:", e);
      results.missao = false;
    }
  }

  // 2. Save Vision
  if (data.visao?.statement) {
    try {
      const { data: existingVision } = await supabase
        .from("vision_sessions")
        .select("id")
        .eq("account_id", accountId)
        .maybeSingle();

      if (existingVision) {
        await supabase
          .from("vision_sessions")
          .update({
            final_vision: data.visao.statement,
            horizon: data.visao.horizon || null,
            stage: 13,
          })
          .eq("id", existingVision.id);
      } else {
        await supabase.from("vision_sessions").insert({
          account_id: accountId,
          user_id: userId,
          final_vision: data.visao.statement,
          horizon: data.visao.horizon || null,
          stage: 13,
        });
      }
      results.visao = true;
    } catch (e) {
      console.error("Error saving vision:", e);
      results.visao = false;
    }
  }

  // 3. Save Values
  if (data.valores?.values?.length > 0) {
    try {
      const { data: existingValues } = await supabase
        .from("values_sessions")
        .select("id")
        .eq("account_id", accountId)
        .maybeSingle();

      let valuesSessionId: string;

      if (existingValues) {
        valuesSessionId = existingValues.id;
        await supabase
          .from("values_sessions")
          .update({ stage: 9 })
          .eq("id", valuesSessionId);
        
        // Clear existing selections and behaviors
        await supabase
          .from("values_selections")
          .delete()
          .eq("session_id", valuesSessionId);
        await supabase
          .from("values_behaviors_selections")
          .delete()
          .eq("session_id", valuesSessionId);
      } else {
        const { data: newSession } = await supabase
          .from("values_sessions")
          .insert({
            account_id: accountId,
            user_id: userId,
            stage: 9,
          })
          .select("id")
          .single();
        valuesSessionId = newSession!.id;
      }

      // Get values catalog
      const { data: valuesCatalog } = await supabase
        .from("values_catalog")
        .select("id, label");

      // Insert values selections
      for (const value of data.valores.values) {
        // Try to find matching value in catalog
        const catalogValue = valuesCatalog?.find(
          (v: { id: string; label: string }) => v.label.toLowerCase() === value.label.toLowerCase()
        );

        if (catalogValue) {
          await supabase.from("values_selections").insert({
            session_id: valuesSessionId,
            value_id: catalogValue.id,
            phase: 3,
          });

          // Insert behaviors
          for (const doText of value.dos || []) {
            await supabase.from("values_behaviors_selections").insert({
              session_id: valuesSessionId,
              value_id: catalogValue.id,
              behavior_type: "do",
              behavior_text: doText,
            });
          }
          for (const dontText of value.donts || []) {
            await supabase.from("values_behaviors_selections").insert({
              session_id: valuesSessionId,
              value_id: catalogValue.id,
              behavior_type: "dont",
              behavior_text: dontText,
            });
          }
        }
      }
      results.valores = true;
    } catch (e) {
      console.error("Error saving values:", e);
      results.valores = false;
    }
  }

  // 4. Save Strategic Indicators
  const hasIndicators =
    data.indicadores?.financeira?.length ||
    data.indicadores?.clientes?.length ||
    data.indicadores?.processos?.length ||
    data.indicadores?.aprendizado?.length;

  if (hasIndicators) {
    try {
      const { data: existingIndicators } = await supabase
        .from("strategic_indicators")
        .select("id")
        .eq("account_id", accountId)
        .maybeSingle();

      const indicatorsData = {
        selected_step1: {
          financeira: data.indicadores.financeira || [],
          clientes: data.indicadores.clientes || [],
          processos: data.indicadores.processos || [],
          aprendizado: data.indicadores.aprendizado || [],
        },
        final_selection: {
          financeira: data.indicadores.financeira || [],
          clientes: data.indicadores.clientes || [],
          processos: data.indicadores.processos || [],
          aprendizado: data.indicadores.aprendizado || [],
        },
      };

      if (existingIndicators) {
        await supabase
          .from("strategic_indicators")
          .update({ ...indicatorsData, stage: 3 })
          .eq("id", existingIndicators.id);
      } else {
        await supabase.from("strategic_indicators").insert({
          account_id: accountId,
          user_id: userId,
          ...indicatorsData,
          stage: 3,
        });
      }
      results.indicadores = true;
    } catch (e) {
      console.error("Error saving indicators:", e);
      results.indicadores = false;
    }
  }

  // 5. Save Strategic Projects
  if (data.projetos?.length > 0) {
    try {
      // Delete existing projects
      await supabase
        .from("strategic_projects")
        .delete()
        .eq("account_id", accountId);

      // Insert new projects
      for (const project of data.projetos) {
        await supabase.from("strategic_projects").insert({
          account_id: accountId,
          user_id: userId,
          name: project.name,
          perspective: project.perspective || "processos",
          importance: project.importance || "",
        });
      }
      results.projetos = true;
    } catch (e) {
      console.error("Error saving projects:", e);
      results.projetos = false;
    }
  }

  // 6. Save Energy
  if (data.energia?.items?.length > 0) {
    try {
      const { data: existingEnergy } = await supabase
        .from("energy_sessions")
        .select("id")
        .eq("account_id", accountId)
        .maybeSingle();

      let energySessionId: string;

      if (existingEnergy) {
        energySessionId = existingEnergy.id;
        await supabase
          .from("energy_sessions")
          .update({ stage: 5 })
          .eq("id", energySessionId);
        
        await supabase
          .from("energy_selections")
          .delete()
          .eq("session_id", energySessionId);
      } else {
        const { data: newSession } = await supabase
          .from("energy_sessions")
          .insert({
            account_id: accountId,
            user_id: userId,
            stage: 5,
          })
          .select("id")
          .single();
        energySessionId = newSession!.id;
      }

      // Get energy catalog
      const { data: energyCatalog } = await supabase
        .from("energy_catalog")
        .select("id, label");

      // Try to match items
      for (const item of data.energia.items) {
        const catalogItem = energyCatalog?.find(
          (c: { id: string; label: string }) => c.label.toLowerCase().includes(item.toLowerCase()) ||
                 item.toLowerCase().includes(c.label.toLowerCase())
        );
        if (catalogItem) {
          await supabase.from("energy_selections").insert({
            session_id: energySessionId,
            item_id: catalogItem.id,
            phase: 3,
          });
        }
      }
      results.energia = true;
    } catch (e) {
      console.error("Error saving energy:", e);
      results.energia = false;
    }
  }

  // 7. Save Development
  if (data.desenvolvimento?.items?.length > 0) {
    try {
      const { data: existingDev } = await supabase
        .from("development_sessions")
        .select("id")
        .eq("account_id", accountId)
        .maybeSingle();

      let devSessionId: string;

      if (existingDev) {
        devSessionId = existingDev.id;
        await supabase
          .from("development_sessions")
          .update({ stage: 5 })
          .eq("id", devSessionId);
        
        await supabase
          .from("development_selections")
          .delete()
          .eq("session_id", devSessionId);
      } else {
        const { data: newSession } = await supabase
          .from("development_sessions")
          .insert({
            account_id: accountId,
            user_id: userId,
            stage: 5,
          })
          .select("id")
          .single();
        devSessionId = newSession!.id;
      }

      // Get development catalog
      const { data: devCatalog } = await supabase
        .from("development_catalog")
        .select("id, label");

      // Try to match items
      for (const item of data.desenvolvimento.items) {
        const catalogItem = devCatalog?.find(
          (c: { id: string; label: string }) => c.label.toLowerCase().includes(item.toLowerCase()) ||
                 item.toLowerCase().includes(c.label.toLowerCase())
        );
        if (catalogItem) {
          await supabase.from("development_selections").insert({
            session_id: devSessionId,
            item_id: catalogItem.id,
            phase: 3,
          });
        }
      }
      results.desenvolvimento = true;
    } catch (e) {
      console.error("Error saving development:", e);
      results.desenvolvimento = false;
    }
  }

  // 8. Save Decision
  if (data.decisao?.guidelines?.length > 0) {
    try {
      const { data: existingDecision } = await supabase
        .from("decision_sessions")
        .select("id")
        .eq("account_id", accountId)
        .maybeSingle();

      let decisionSessionId: string;

      const compiledDecision = {
        summary: data.decisao.summary || data.decisao.guidelines.join(". "),
        guidelines: data.decisao.guidelines,
      };

      if (existingDecision) {
        decisionSessionId = existingDecision.id;
        await supabase
          .from("decision_sessions")
          .update({ compiled_decision: compiledDecision, stage: 9 })
          .eq("id", decisionSessionId);
        
        await supabase
          .from("decision_answers")
          .delete()
          .eq("session_id", decisionSessionId);
      } else {
        const { data: newSession } = await supabase
          .from("decision_sessions")
          .insert({
            account_id: accountId,
            user_id: userId,
            compiled_decision: compiledDecision,
            stage: 9,
          })
          .select("id")
          .single();
        decisionSessionId = newSession!.id;
      }

      // Insert guidelines as answers
      for (let i = 0; i < data.decisao.guidelines.length; i++) {
        await supabase.from("decision_answers").insert({
          session_id: decisionSessionId,
          question_number: i + 1,
          answer_text: data.decisao.guidelines[i],
        });
      }
      results.decisao = true;
    } catch (e) {
      console.error("Error saving decision:", e);
      results.decisao = false;
    }
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData?.user;
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has EP Partner or Super Admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roleSet = new Set((roles || []).map((r: { role: string }) => r.role));
    const hasPermission = roleSet.has("super_admin") || roleSet.has("ep_partner");

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: "Permission denied. Only EP Partners and Super Admins can import culture codes." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { pdfBase64, fileUrl, accountId, previewOnly, extractedData: providedData } = await req.json();

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: "Account ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify account exists
    const { data: account, error: accountError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", accountId)
      .single();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ error: "Account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing culture PDF for account: ${account.name} (${accountId})`);

    // If provided data exists (second call for saving), use it directly
    if (providedData && !previewOnly) {
      console.log("Using provided extracted data for saving");
      const results = await saveCultureData(supabase, accountId, user.id, providedData);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          results,
          accountName: account.name,
          data: providedData
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Otherwise, extract from PDF
    // Support fileUrl: fetch PDF from storage URL and convert to base64
    let pdfData = pdfBase64;
    if (fileUrl && (!pdfData || pdfData === "skip")) {
      console.log("Fetching PDF from URL:", fileUrl);
      const pdfResponse = await fetch(fileUrl);
      if (!pdfResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch PDF from storage" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const pdfBuffer = await pdfResponse.arrayBuffer();
      // Convert to base64
      const uint8Array = new Uint8Array(pdfBuffer);
      let binaryString = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      pdfData = btoa(binaryString);
    }

    if (!pdfData || pdfData === "skip") {
      return new Response(
        JSON.stringify({ error: "PDF data is required. Provide pdfBase64 or fileUrl." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract culture data from PDF
    const extractedData = await extractCultureFromPDF(pdfData);

    console.log("Extracted data:", JSON.stringify(extractedData, null, 2));

    // If preview only, return extracted data without saving
    if (previewOnly) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          preview: true,
          data: extractedData,
          accountName: account.name
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save culture data
    const results = await saveCultureData(supabase, accountId, user.id, extractedData);

    console.log("Save results:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        accountName: account.name,
        data: extractedData
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in import-culture-pdf:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
