import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rjitzozuzonlnvczuvcy.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaXR6b3p1em9ubG52Y3p1dmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NjAwNzksImV4cCI6MjA3NjAzNjA3OX0.0UAspkmlNEX3WchvOff8ROKaDiHSn4Y2YhxmCSE3pZo';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      Origin: 'https://sumulando.com.br',
      Referer: 'https://sumulando.com.br/',
    },
  },
});
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SITE_URL = 'https://sumulando.com.br';

function buildXml(urls) {
  const entries = urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

async function fetchAllSumulas() {
  const PAGE = 1000;
  let all = [];
  let page = 0;
  while (true) {
    const { data: chunk, error } = await supabase
      .from('sumulas')
      .select('slug, updated_at')
      .range(page * PAGE, (page + 1) * PAGE - 1)
      .order('id');
    if (error) throw error;
    if (!chunk || chunk.length === 0) break;
    all = all.concat(chunk);
    if (chunk.length < PAGE) break;
    page++;
  }
  return all;
}

async function generateSitemap() {
  console.log('Generating sitemap...');

  const today = new Date().toISOString().split('T')[0];

  // Static URLs — always included regardless of Supabase availability
  const urls = [
    { loc: SITE_URL,               lastmod: today, changefreq: 'daily',   priority: '1.0' },
    { loc: `${SITE_URL}/busca`,    lastmod: today, changefreq: 'weekly',  priority: '0.8' },
  ];

  // Dynamic content — each block fails independently so partial data is still written
  try {
    const { data, error } = await supabase.from('institutional_pages').select('slug, updated_at');
    if (error) throw error;
    (data || []).forEach(p => urls.push({
      loc: `${SITE_URL}/institucional/${p.slug}`,
      lastmod: new Date(p.updated_at || Date.now()).toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.7',
    }));
    console.log(`  + ${(data || []).length} páginas institucionais`);
  } catch (err) {
    console.warn('  ! Institutional pages unavailable:', err.message);
  }

  try {
    const { data, error } = await supabase.from('topicos').select('slug, updated_at').not('slug', 'is', null);
    if (error) throw error;
    (data || []).forEach(t => urls.push({
      loc: `${SITE_URL}/busca?topico=${t.slug}`,
      lastmod: new Date(t.updated_at || Date.now()).toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.6',
    }));
    console.log(`  + ${(data || []).length} tópicos`);
  } catch (err) {
    console.warn('  ! Topics unavailable:', err.message);
  }

  try {
    const sumulas = await fetchAllSumulas();
    sumulas.filter(s => s.slug).forEach(s => urls.push({
      loc: `${SITE_URL}/sumula/${s.slug}`,
      lastmod: new Date(s.updated_at || Date.now()).toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.7',
    }));
    console.log(`  + ${sumulas.length} súmulas`);
  } catch (err) {
    console.warn('  ! Sumulas unavailable:', err.message);
  }

  // Always write — even if only static URLs are present
  const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, buildXml(urls), 'utf8');
  console.log(`Sitemap written: ${sitemapPath} (${urls.length} URLs total)`);
}

generateSitemap().catch(err => {
  console.error('Fatal error in sitemap generation:', err);
  process.exit(1);
});
