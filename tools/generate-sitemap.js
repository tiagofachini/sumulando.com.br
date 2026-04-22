import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// WARNING: Do not expose sensitive keys in client-side code.
// These are environment variables that should be set in your build environment.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is not defined. Skipping sitemap generation.");
  process.exit(0); // Exit gracefully
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SITE_URL = 'https://sumulando.com.br'; // Replace with your actual domain

async function generateSitemap() {
  console.log("Generating sitemap...");

  try {
    const { data: institutionalPages, error: pagesError } = await supabase
      .from('institutional_pages')
      .select('slug, updated_at');
    
    if (pagesError) {
      throw new Error(`Error fetching institutional pages: ${pagesError.message}`);
    }

    const urls = [
      { loc: SITE_URL, lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: '1.0' },
      { loc: `${SITE_URL}/busca`, lastmod: new Date().toISOString().split('T')[0], changefreq: 'weekly', priority: '0.8' }
    ];
    
    if (institutionalPages) {
      institutionalPages.forEach(page => {
        urls.push({
          loc: `${SITE_URL}/institucional/${page.slug}`,
          lastmod: new Date(page.updated_at || page.created_at).toISOString().split('T')[0],
          changefreq: 'monthly',
          priority: '0.7'
        });
      });
    }


    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${urls.map(url => `
          <url>
            <loc>${url.loc}</loc>
            <lastmod>${url.lastmod}</lastmod>
            <changefreq>${url.changefreq}</changefreq>
            <priority>${url.priority}</priority>
          </url>
        `).join('')}
      </urlset>
    `.trim();

    const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemapContent);

    console.log(`Sitemap generated successfully at ${sitemapPath} with ${urls.length} URLs.`);

  } catch (err) {
    console.error("Could not generate sitemap:", err);
    // Don't fail the build, just log the error
  }
}

generateSitemap();