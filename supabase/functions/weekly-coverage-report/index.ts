import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminEmail  = Deno.env.get('ADMIN_EMAIL');
  const resendKey   = Deno.env.get('RESEND_API_KEY');

  try {
    const db = createClient(supabaseUrl, serviceKey);

    // Step 1: compute coverage — always runs, independent of email config
    const { data: rows, error } = await db.rpc('get_coverage_report');
    if (error) throw error;

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No tribunais configured for monitoring.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
    });

    const totalExpected = rows.reduce((s: number, r: any) => s + (r.expected_count || 0), 0);
    const totalHave     = rows.reduce((s: number, r: any) => s + Number(r.sumulas_count || 0), 0);
    const totalMissing  = rows.reduce((s: number, r: any) => s + (r.missing_numbers?.length || 0), 0);
    const overallPct    = totalExpected > 0 ? ((totalHave / totalExpected) * 100).toFixed(1) : '0';

    const coverageResult = {
      ok: true,
      date: today,
      tribunais_analisados: rows.length,
      total_esperado: totalExpected,
      total_identificado: totalHave,
      total_faltando: totalMissing,
      cobertura_pct: overallPct,
    };

    // Step 2: send email — optional, failure does NOT fail the function
    if (!adminEmail || !resendKey) {
      console.warn('ADMIN_EMAIL or RESEND_API_KEY not configured — skipping email.');
      return new Response(
        JSON.stringify({ ...coverageResult, email_sent: false, email_reason: 'env vars not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const buildUrl = (template: string | null, officialUrl: string | null, n: number): string => {
      if (template) return template.replace('{n}', String(n));
      return officialUrl || '#';
    };

    const rowsHtml = rows.map((r: any) => {
      const pct = parseFloat(r.coverage_pct) || 0;
      const missing: number[] = r.missing_numbers || [];
      const color = pct >= 90 ? '#16a34a' : pct >= 70 ? '#d97706' : '#dc2626';
      const missingLinks = missing.slice(0, 30).map((n: number) => {
        const url = buildUrl(r.sumula_url_template, r.official_url, n);
        return `<a href="${url}" style="color:#2563eb;font-family:monospace;font-size:12px;">${n}</a>`;
      }).join(', ');
      const extra = missing.length > 30 ? ` ... e mais ${missing.length - 30}` : '';
      return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;">
            ${r.official_url
              ? `<a href="${r.official_url}" style="color:#111827;font-weight:600;">${r.tribunal_name}</a>`
              : `<strong>${r.tribunal_name}</strong>`}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${r.sumulas_count} / ${r.expected_count}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;color:${color};font-weight:700;">${pct}%</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${missingLinks}${extra}</td>
        </tr>`;
    }).join('');

    const htmlBody = `
      <div style="font-family:sans-serif;max-width:700px;margin:0 auto;">
        <h2 style="color:#1e40af;">Relatório Semanal de Cobertura — Sumulando</h2>
        <p style="color:#374151;">${today}</p>
        <div style="display:flex;gap:16px;margin:20px 0;flex-wrap:wrap;">
          <div style="background:#eff6ff;border-radius:8px;padding:16px 24px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#1d4ed8;">${overallPct}%</div>
            <div style="font-size:13px;color:#3b82f6;">Cobertura geral</div>
          </div>
          <div style="background:#f0fdf4;border-radius:8px;padding:16px 24px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#15803d;">${totalHave.toLocaleString('pt-BR')}</div>
            <div style="font-size:13px;color:#22c55e;">Identificadas nos tribunais</div>
          </div>
          <div style="background:#fef2f2;border-radius:8px;padding:16px 24px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#dc2626;">${totalMissing.toLocaleString('pt-BR')}</div>
            <div style="font-size:13px;color:#f87171;">Faltando</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 8px;text-align:left;color:#374151;">Tribunal</th>
              <th style="padding:10px 8px;text-align:center;color:#374151;">Temos / Esperado</th>
              <th style="padding:10px 8px;text-align:center;color:#374151;">Cobertura</th>
              <th style="padding:10px 8px;text-align:left;color:#374151;">Números faltando</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <p style="margin-top:24px;">
          <a href="https://sumulando.com.br/admfachini/cobertura"
            style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
            Ver painel de cobertura →
          </a>
        </p>
      </div>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Sumulando <notificacoes@sumulando.com.br>',
        to: [adminEmail],
        subject: `[Sumulando] Relatório de Cobertura Semanal — ${today}`,
        html: htmlBody,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('Resend error:', err);
      return new Response(
        JSON.stringify({ ...coverageResult, email_sent: false, email_reason: err }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ...coverageResult, email_sent: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('weekly-coverage-report error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
