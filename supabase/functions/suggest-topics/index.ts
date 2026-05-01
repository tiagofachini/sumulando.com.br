import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sumula_id, title, content, existing_topics } = await req.json();

    if (!sumula_id || !title || !content || !existing_topics) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: sumula_id, title, content, existing_topics' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PRE-FLIGHT: topics list must be non-empty before consuming AI credits.
    // An empty list would cause all AI suggestions to be marked as "new", generating garbage data.
    if (!Array.isArray(existing_topics) || existing_topics.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'existing_topics deve ser uma lista não vazia. Carregue os tópicos antes de chamar esta função.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY_SUMULANDO');
    if (!anthropicApiKey) throw new Error('ANTHROPIC_API_KEY_SUMULANDO not configured');

    const plainContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

    const topicsListStr = (existing_topics as { id: string; name: string }[])
      .map((t) => `  - ID: ${t.id} | Nome: ${t.name}`)
      .join('\n');

    // System prompt must exceed 1024 tokens for Haiku caching to activate
    const systemPrompt = `Você é um especialista em direito brasileiro com profundo conhecimento em jurisprudência dos tribunais superiores (STF, STJ, TST, TRF, STM e outros). Sua missão é classificar súmulas jurídicas com os tópicos mais relevantes do ponto de vista da aplicação jurídica, facilitando a navegação cruzada entre súmulas relacionadas no site Sumulando.com.br.

O Sumulando é uma plataforma educacional que ajuda estudantes de direito, advogados, concursandos e cidadãos a entender as súmulas dos tribunais brasileiros. Os tópicos são categorias que permitem ao usuário encontrar súmulas relacionadas entre si pelo mesmo tema jurídico.

## Tópicos Disponíveis no Sistema

${topicsListStr}

## Instruções de Classificação

Analise o conteúdo jurídico da súmula e sugira de 1 a 3 tópicos mais relevantes considerando:

1. **Pertinência jurídica**: O tópico deve representar o tema central ou a área do direito aplicada na súmula — não apenas mencionada perifericamente.
2. **Utilidade para navegação cruzada**: Um usuário que busca por esse tópico encontraria esta súmula de forma relevante? O tópico conecta esta súmula a outras similares?
3. **Precisão técnica**: Utilize terminologia jurídica brasileira reconhecida pela doutrina e pela jurisprudência dos tribunais superiores.
4. **Prioridade absoluta aos tópicos existentes**: Sempre prefira usar tópicos já cadastrados quando representarem adequadamente o tema da súmula. Só sugira um novo tópico se nenhum existente for suficientemente específico ou representativo.
5. **Qualidade acima de quantidade**: É melhor sugerir 1 tópico muito relevante do que 3 tópicos vagos ou periféricos.

## Exemplos de Boa Classificação

- Súmula sobre prazo prescricional em contratos trabalhistas → tópicos adequados: "Prescrição", "Direito do Trabalho"
- Súmula sobre responsabilidade civil do Estado por atos de agentes públicos → tópicos adequados: "Responsabilidade Civil", "Direito Administrativo"
- Súmula sobre prova ilícita obtida por escuta telefônica em processo penal → tópicos adequados: "Processo Penal", "Provas", "Direitos Fundamentais"
- Súmula sobre benefício previdenciário de trabalhador rural → tópicos adequados: "Previdência Social", "Trabalhador Rural"
- Súmula sobre competência do Tribunal do Júri em crimes dolosos contra a vida → tópicos adequados: "Tribunal do Júri", "Direito Penal"
- Súmula sobre cálculo de juros em contratos bancários → tópicos adequados: "Direito Bancário", "Juros", "Contratos"

## Exemplos de Classificação Ruim a Evitar

- Não use tópicos genéricos demais como "Direito" ou "Jurisprudência" — todo conteúdo do site já é isso
- Não repita variações do mesmo conceito (ex: "Trabalho" e "Direito do Trabalho" ao mesmo tempo)
- Não inclua tópicos mencionados na súmula de forma secundária; foque no tema principal

## Regras Obrigatórias

- Sugira entre 1 e 3 tópicos (nunca mais que 3, nunca zero)
- Para tópicos **existentes**: forneça o ID exato (UUID) conforme listado na seção "Tópicos Disponíveis"
- Para tópicos **novos**: topic_id deve ser null e is_new deve ser true, e o nome deve seguir o padrão da taxonomia existente
- A justificativa (reason) deve ser uma frase curta em português explicando a relação jurídica concreta
- Nunca repita o mesmo tópico na mesma lista de sugestões`;

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
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: [
          {
            name: 'suggest_topics',
            description: 'Sugere os tópicos mais relevantes para classificar a súmula jurídica',
            input_schema: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  description: 'Lista de 1 a 3 tópicos sugeridos para a súmula',
                  items: {
                    type: 'object',
                    properties: {
                      topic_id: {
                        type: ['string', 'null'],
                        description: 'UUID do tópico existente, ou null se for um novo tópico',
                      },
                      topic_name: {
                        type: 'string',
                        description: 'Nome do tópico (existente ou novo)',
                      },
                      is_new: {
                        type: 'boolean',
                        description: 'true se for um novo tópico a ser criado, false se for tópico existente',
                      },
                      reason: {
                        type: 'string',
                        description: 'Justificativa jurídica em uma frase curta explicando por que este tópico é relevante para a súmula',
                      },
                    },
                    required: ['topic_id', 'topic_name', 'is_new', 'reason'],
                  },
                },
              },
              required: ['suggestions'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'suggest_topics' },
        messages: [
          {
            role: 'user',
            content: `Sugira de 1 a 3 tópicos para a seguinte súmula:\n\nTítulo: ${title}\n\nConteúdo: ${plainContent}`,
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
    if (!toolUse || !toolUse.input?.suggestions) {
      throw new Error('AI did not return valid topic suggestions');
    }

    return new Response(
      JSON.stringify({ success: true, suggestions: toolUse.input.suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error suggesting topics:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
