import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://rjitzozuzonlnvczuvcy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaXR6b3p1em9ubG52Y3p1dmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NjAwNzksImV4cCI6MjA3NjAzNjA3OX0.0UAspkmlNEX3WchvOff8ROKaDiHSn4Y2YhxmCSE3pZo';

const SITE_URL = 'https://sumulando.com.br';
const PUBLIC_DIR = path.join(process.cwd(), 'public');

console.log(`[sitemap] Key type: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon'}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

function buildXml(urls) {
  const entries = urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

function toDate(raw) {
  try { return new Date(raw || Date.now()).toISOString().split('T')[0]; }
  catch { return new Date().toISOString().split('T')[0]; }
}

async function fetchPage(table, select, page, pageSize) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (error) throw new Error(`${table} page ${page}: ${error.message}`);
  return data || [];
}

async function fetchAll(table, select) {
  const PAGE = 1000;
  let all = [];
  let page = 0;
  while (true) {
    const chunk = await fetchPage(table, select, page, PAGE);
    all = all.concat(chunk);
    if (chunk.length < PAGE) break;
    page++;
  }
  return all;
}

async function generateSitemap() {
  console.log('[sitemap] Generating...');
  const today = new Date().toISOString().split('T')[0];

  const urls = [
    { loc: SITE_URL,            lastmod: today, changefreq: 'daily',   priority: '1.0' },
    { loc: `${SITE_URL}/busca`, lastmod: today, changefreq: 'weekly',  priority: '0.8' },
  ];

  // Institutional pages
  try {
    const { data, error } = await supabase.from('institutional_pages').select('slug, updated_at');
    if (error) throw error;
    const pages = data || [];
    pages.forEach(p => urls.push({
      loc: `${SITE_URL}/institucional/${p.slug}`,
      lastmod: toDate(p.updated_at),
      changefreq: 'monthly',
      priority: '0.7',
    }));
    console.log(`[sitemap] + ${pages.length} páginas institucionais`);
  } catch (err) {
    console.error('[sitemap] ! institutional_pages:', err.message);
  }

  // Topics
  try {
    const { count: topicCount } = await supabase.from('topicos').select('*', { count: 'exact', head: true });
    console.log(`[sitemap] topicos total rows: ${topicCount}`);
    const topics = await fetchAll('topicos', 'id, name, slug');
    const withSlug = topics.filter(t => t.slug);
    withSlug.forEach(t => urls.push({
      loc: `${SITE_URL}/busca?topico=${t.slug}`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.6',
    }));
    console.log(`[sitemap] + ${withSlug.length} tópicos (${topics.length} fetched, ${topics.length - withSlug.length} sem slug)`);
  } catch (err) {
    console.error('[sitemap] ! topicos:', err.message);
  }

  // Sumulas — paginated, uses publish_date
  try {
    const { count: sumulaCount } = await supabase.from('sumulas').select('*', { count: 'exact', head: true });
    console.log(`[sitemap] sumulas total rows: ${sumulaCount}`);
    const sumulas = await fetchAll('sumulas', 'id, slug, publish_date');
    const withSlug = sumulas.filter(s => s.slug);
    withSlug.forEach(s => urls.push({
      loc: `${SITE_URL}/sumula/${s.slug}`,
      lastmod: toDate(s.publish_date),
      changefreq: 'monthly',
      priority: '0.7',
    }));
    console.log(`[sitemap] + ${withSlug.length} súmulas (${sumulas.length} fetched, ${sumulas.length - withSlug.length} sem slug)`);
  } catch (err) {
    console.error('[sitemap] ! sumulas:', err.message);
  }

  const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, buildXml(urls), 'utf8');
  console.log(`[sitemap] Written: ${sitemapPath} (${urls.length} URLs)`);
}

generateSitemap().catch(err => {
  console.error('[sitemap] Fatal:', err);
  process.exit(1);
});
