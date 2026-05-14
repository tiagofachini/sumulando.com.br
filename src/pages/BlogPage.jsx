import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SITE_URL = 'https://sumulando.com.br';

const BlogPage = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://app.trysoro.com/api/embed/ed84e0d3-a29f-42cc-aa0a-d100b66a57f9';
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Blog — Sumulando</title>
        <meta name="description" content="Artigos e atualizações sobre súmulas, jurisprudência e direito dos principais tribunais brasileiros." />
        <link rel="canonical" href={`${SITE_URL}/blog`} />
        <meta property="og:url" content={`${SITE_URL}/blog`} />
        <meta property="og:title" content="Blog — Sumulando" />
        <meta property="og:description" content="Artigos e atualizações sobre súmulas, jurisprudência e direito dos principais tribunais brasileiros." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-8 pb-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Blog</h1>
            <div id="soro-blog" />
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default BlogPage;
