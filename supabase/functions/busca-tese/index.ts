import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

  try {
    const body = await req.json();
    const tese = (body?.tese || '').trim();

    if (tese.length < 20) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Texto da tese muito curto (mínimo 20 caracteres).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'ANTHROPIC_API_KEY não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const db = createClient(supabaseUrl, serviceKey);

    const [{ data: tribunais }, { data: topicos }] = await Promise.all([
      db.from('tribunais').select('id, name').order('name'),
      db.from('topicos').select('id, name, slug').order('name'),
    ]);

    const tribunaisText = (tribunais || []).map((t: any) => `- ${t.name} (id: ${t.id})`).join('\n');
    const topicosText   = (topicos   || []).map((t: any) => `- ${t.name} (slug: ${t.slug})`).join('\n');

    const prompt = `Você é um assistente jurídico especializado em súmulas e jurisprudência brasileira.

O usuário informou a seguinte tese jurídica:
"""
${tese}
"""

Com base nessa tese, identifique os parâmetros mais relevantes para buscar súmulas relacionadas.

Tribunais disponíveis:
${tribunaisText}

Tópicos disponíveis:
${topicosText}

Retorne APENAS um objeto JSON válido (sem markdown, sem explicações) com:
- "q": string com as 2-4 palavras-chave mais relevantes para busca por texto livre (sem artigos ou preposições)
- "topicos": array de slugs dos tópicos mais relevantes (máximo 3, pode ser array vazio)
- "tribunais": array de IDs dos tribunais mais relevantes (máximo 3, pode ser array vazio)

Se a tese não indicar claramente um tribunal específico, deixe "tribunais" como array vazio.
Responda apenas com o JSON, sem nenhum texto adicional.`;

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`Anthropic API error: ${errText}`);
    }

    const aiData = await aiRes.json();
    const rawText = (aiData.content?.[0]?.text || '').trim();

    let parsed: { q?: string; topicos?: string[]; tribunais?: string[] };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Claude retornou resposta inválida.');
      parsed = JSON.parse(match[0]);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        q: parsed.q || '',
        topicos:   Array.isArray(parsed.topicos)   ? parsed.topicos   : [],
        tribunais: Array.isArray(parsed.tribunais) ? parsed.tribunais : [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('busca-tese error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
