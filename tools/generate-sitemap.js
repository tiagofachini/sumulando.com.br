import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rjitzozuzonlnvczuvcy.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaXR6b3p1em9ubG52Y3p1dmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NjAwNzksImV4cCI6MjA3NjAzNjA3OX0.0UAspkmlNEX3WchvOff8ROKaDiHSn4Y2YhxmCSE3pZo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SITE_URL = 'https://sumulando.com.br';

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
    if (error) throw new Error(`Error fetching sumulas: ${error.message}`);
    if (!chunk || chunk.length === 0) break;
    all = all.concat(chunk);
    if (chunk.length < PAGE) break;
    page++;
  }
  return all;
}

async function generateSitemap() {
  console.log("Generating sitemap...");

  try {
    const [institutionalPages, topicsData, allSumulas] = await Promise.all([
      supabase.from('institutional_pages').select('slug, updated_at').then(r => {
        if (r.error) throw new Error(`Error fetching institutional pages: ${r.error.message}`);
        return r.data || [];
      }),
      supabase.from('topicos').select('slug, updated_at').not('slug', 'is', null).then(r => r.data || []),
      fetchAllSumulas(),
    ]);

    const today = new Date().toISOString().split('T')[0];

    const urls = [
      { loc: SITE_URL, lastmod: today, changefreq: 'daily', priority: '1.0' },
      { loc: `${SITE_URL}/busca`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
    ];

    institutionalPages.forEach(page => {
      urls.push({
        loc: `${SITE_URL}/institucional/${page.slug}`,
        lastmod: new Date(page.updated_at || Date.now()).toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: '0.7',
      });
    });

    topicsData.forEach(topic => {
      urls.push({
        loc: `${SITE_URL}/busca?topico=${topic.slug}`,
        lastmod: new Date(topic.updated_at || Date.now()).toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: '0.6',
      });
    });

    allSumulas.forEach(sumula => {
      if (!sumula.slug) return;
      urls.push({
        loc: `${SITE_URL}/sumula/${sumula.slug}`,
        lastmod: new Date(sumula.updated_at || Date.now()).toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: '0.7',
      });
    });

    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemapContent);

    console.log(`Sitemap generated: ${sitemapPath} — ${urls.length} URLs (${allSumulas.length} súmulas, ${topicsData.length} tópicos)`);

  } catch (err) {
    console.error("Could not generate sitemap:", err);
  }
}

generateSitemap();
