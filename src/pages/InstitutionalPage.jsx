import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const InstitutionalPage = () => {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchPage = async () => {
      if (!supabase) return;
      setLoading(true);

      const { data, error } = await supabase
        .from('institutional_pages')
        .select('title, content')
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('Error fetching institutional page:', error);
        setPage(null);
      } else {
        setPage(data);
      }
      setLoading(false);
    };

    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center bg-gray-50">
          <p className="text-xl text-gray-600">Carregando...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center bg-gray-50">
          <p className="text-xl text-gray-600">Página não encontrada.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${page.title} - Sumulando`}</title>
        <meta name="description" content={`Informações sobre ${page.title} no Sumulando.`} />
        <meta property="og:title" content={`${page.title} - Sumulando`} />
        <meta property="og:description" content={`Informações sobre ${page.title} no Sumulando.`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://horizons-cdn.hostinger.com/d74f9542-f4b8-44ac-931b-e7d3b882cbac/19ab7e2e664db850bc6e313bf2b5dcdb.jpg" />
        <meta property="og:image:alt" content="Sumulando - Balança da Justiça" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${page.title} - Sumulando`} />
        <meta name="twitter:description" content={`Informações sobre ${page.title} no Sumulando.`} />
        <meta name="twitter:image" content="https://horizons-cdn.hostinger.com/d74f9542-f4b8-44ac-931b-e7d3b882cbac/19ab7e2e664db850bc6e313bf2b5dcdb.jpg" />
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-B3DPVRHY5H"></script>
        <script>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-B3DPVRHY5H');
          `}
        </script>
      </Helmet>

      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-8 pb-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="bg-white/80 backdrop-blur-xl shadow-xl border-white/20 rounded-2xl overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">
                    {page.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <div
                    className="prose max-w-none text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default InstitutionalPage;