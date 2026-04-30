import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é um especialista em direito brasileiro com profundo conhecimento em jurisprudência e súmulas dos tribunais superiores do Brasil. Sua função é criar perguntas frequentes (FAQs) claras, educativas e úteis sobre súmulas jurídicas para o site Sumulando.com.br.

O Sumulando é uma plataforma educacional que ajuda estudantes de direito, advogados, concursandos e cidadãos a entender as súmulas dos tribunais brasileiros como STF, STJ, TST, TRF, STM e outros tribunais. As FAQs devem ser acessíveis ao público geral, mas também rigorosas do ponto de vista jurídico.

## Diretrizes para criação de FAQs

### Qualidade das Perguntas
- As perguntas devem ser as dúvidas mais comuns e relevantes sobre a súmula
- Use linguagem clara e acessível, evitando jargão jurídico desnecessário
- As perguntas devem abordar aspectos práticos e teóricos da súmula
- Inclua perguntas sobre aplicação prática, exceções, casos práticos e contexto histórico

### Qualidade das Respostas
- As respostas devem ser completas mas concisas (entre 2 e 5 parágrafos)
- Explique o raciocínio jurídico por trás da súmula
- Mencione quando a súmula se aplica e quando não se aplica
- Use exemplos práticos quando possível para ilustrar a aplicação
- Indique possíveis exceções e casos limítrofes

### Formato
- Gere exatamente 3 perguntas e respostas para cada súmula
- As perguntas devem ser diferentes entre si e cobrir aspectos distintos
- Cada resposta deve ser independente e completa

### Contexto Legal
- Leve em consideração o tribunal de origem da súmula
- Considere o contexto constitucional e legal brasileiro
- As respostas devem estar de acordo com o ordenamento jurídico brasileiro vigente
- Quando relevante, mencione legislação correlata (Constituição Federal, Código Civil, CLT, etc.)

### Exemplos de boas perguntas para FAQs jurídicas:
- "O que esta súmula significa na prática?"
- "Quando esta súmula se aplica?"
- "Quais são as exceções a esta súmula?"
- "Como esta súmula afeta determinada área do direito?"
- "Esta súmula ainda está em vigor?"
- "Quais são os fundamentos desta súmula?"
- "Como os tribunais têm interpretado esta súmula?"
- "Esta súmula se aplica a contratos anteriores à sua edição?"

### Estrutura Jurídica das Respostas
Cada resposta deve, quando aplicável:
1. Explicar o enunciado da súmula em linguagem acessível
2. Apresentar os fundamentos legais e constitucionais
3. Indicar o âmbito de aplicação e casos práticos
4. Mencionar exceções, críticas doutrinárias ou jurisprudência divergente
5. Citar legislação correlata relevante

Sempre gere FAQs que agreguem valor real ao entendimento da súmula e que ajudem os usuários a compreender melhor o direito brasileiro. Nunca repita as mesmas informações em perguntas diferentes. Cada FAQ deve abordar um aspecto único e relevante da súmula.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sumula_id, title, content } = await req.json();

    if (!sumula_id || !title || !content) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: sumula_id, title, content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY_SUMULANDO');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY_SUMULANDO secret not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

    // Strip HTML tags from content for cleaner input
    const plainContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: [
          {
            name: 'save_faqs',
            description: 'Salva as perguntas frequentes geradas para a súmula informada',
            input_schema: {
              type: 'object',
              properties: {
                faqs: {
                  type: 'array',
                  description: 'Lista com exatamente 3 FAQs sobre a súmula',
                  items: {
                    type: 'object',
                    properties: {
                      question: {
                        type: 'string',
                        description: 'A pergunta da FAQ, formulada como uma dúvida comum do usuário',
                      },
                      answer: {
                        type: 'string',
                        description: 'A resposta completa e detalhada para a pergunta',
                      },
                    },
                    required: ['question', 'answer'],
                  },
                },
              },
              required: ['faqs'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'save_faqs' },
        messages: [
          {
            role: 'user',
            content: `Gere 3 FAQs para a seguinte súmula:\n\nTítulo: ${title}\n\nConteúdo: ${plainContent}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Anthropic API error ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    const toolUse = data.content?.find((c: { type: string }) => c.type === 'tool_use');
    if (!toolUse || !toolUse.input?.faqs || !Array.isArray(toolUse.input.faqs)) {
      throw new Error('AI did not return valid FAQs');
    }

    const faqs: { question: string; answer: string }[] = toolUse.input.faqs;

    const faqRecords = faqs.map((faq) => ({
      sumula_id,
      question: faq.question,
      answer: faq.answer,
    }));

    const { error: insertError } = await supabaseAdmin.from('faqs').insert(faqRecords);
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, count: faqs.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating FAQs:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
