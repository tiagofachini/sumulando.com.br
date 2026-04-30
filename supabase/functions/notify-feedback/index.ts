import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { content, sumula_id, sumula_title, sumula_slug, faq_id, faq_question } = await req.json();

    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    const resendKey = Deno.env.get('RESEND_API_KEY');

    if (!adminEmail || !resendKey) {
      console.error('Missing ADMIN_EMAIL or RESEND_API_KEY env vars');
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subject = faq_question
      ? `[Sumulando] Novo feedback na FAQ: ${faq_question.substring(0, 60)}`
      : `[Sumulando] Novo feedback na súmula: ${(sumula_title || sumula_id || '').toString().substring(0, 60)}`;

    const adminUrl = `https://sumulando.com.br/admfachini/feedbacks`;
    const sumulaUrl = sumula_slug ? `https://sumulando.com.br/sumula/${sumula_slug}` : null;

    const htmlBody = `
      <h2>Novo feedback recebido no Sumulando</h2>
      ${sumula_title ? `<p><strong>Súmula:</strong> ${sumula_title}</p>` : ''}
      ${faq_question ? `<p><strong>FAQ:</strong> ${faq_question}</p>` : ''}
      <p><strong>Mensagem:</strong></p>
      <blockquote style="border-left: 4px solid #6366f1; padding-left: 16px; color: #374151;">${content}</blockquote>
      <p>
        <a href="${adminUrl}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Ver no painel admin</a>
        ${sumulaUrl ? `&nbsp;&nbsp;<a href="${sumulaUrl}" style="color:#6366f1;">Ver súmula</a>` : ''}
      </p>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sumulando <notificacoes@sumulando.com.br>',
        to: [adminEmail],
        subject,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return new Response(JSON.stringify({ error: 'Email failed', detail: err }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('notify-feedback error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
