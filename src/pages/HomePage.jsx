import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Search, Scale } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/MultiSelectCombobox';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';

const SITE_URL = 'https://sumulando.com.br';

const HomePage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTribunais, setSelectedTribunais] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  
  const [tribunais, setTribunais] = useState([]);
  const [topics, setTopics] = useState([]);
  const [sumulasCount, setSumulasCount] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
        if (!supabase) return;
        
        const { data: tribunaisData } = await supabase.from('tribunais').select('id, name');
        const { data: topicsData } = await supabase.from('topicos').select('id, name, slug').order('name');
        setTribunais(tribunaisData || []);
        setTopics(topicsData || []);

        const { count, error } = await supabase
          .from('sumulas')
          .select('*', { count: 'exact', head: true });

        if (!error && count) {
          setSumulasCount(count);
        }
    };
    fetchData();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('q', searchTerm);
    if (selectedTribunais.length > 0) {
      selectedTribunais.forEach(trib => params.append('tribunal', trib.value));
    }
    if (selectedTopics.length > 0) {
      selectedTopics.forEach(cat => params.append('topico', cat.slug || slugify(cat.label)));
    }
    
    navigate(`/busca?${params.toString()}`);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const tribunalOptions = tribunais.map(trib => ({ value: trib.id, label: trib.name }));
  const topicOptions = topics.map(cat => ({ value: cat.id, label: cat.name, slug: cat.slug || slugify(cat.name) }));

  return (
    <>
      <Helmet>
        <title>Sumulando - Busca de Súmulas e Enunciados Judiciais</title>
        <meta name="description" content="Encontre súmulas e enunciados dos principais tribunais brasileiros: STF, STJ, STM, TST e TSE. Busca rápida e organizada." />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:title" content="Sumulando - Busca de Súmulas e Enunciados Judiciais" />
        <meta property="og:description" content="Encontre súmulas e enunciados dos principais tribunais brasileiros: STF, STJ, STM, TST e TSE. Busca rápida e organizada." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://horizons-cdn.hostinger.com/d74f9542-f4b8-44ac-931b-e7d3b882cbac/19ab7e2e664db850bc6e313bf2b5dcdb.jpg" />
        <meta property="og:image:alt" content="Sumulando - Balança da Justiça" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Sumulando - Busca de Súmulas e Enunciados Judiciais" />
        <meta name="twitter:description" content="Encontre súmulas e enunciados dos principais tribunais brasileiros: STF, STJ, STM, TST e TSE. Busca rápida e organizada." />
        <meta name="twitter:image" content="https://horizons-cdn.hostinger.com/d74f9542-f4b8-44ac-931b-e7d3b882cbac/19ab7e2e664db850bc6e313bf2b5dcdb.jpg" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                "url": SITE_URL,
                "name": "Sumulando",
                "description": "Encontre súmulas e enunciados dos principais tribunais brasileiros: STF, STJ, STM, TST e TSE.",
                "inLanguage": "pt-BR",
                "publisher": { "@id": `${SITE_URL}/#organization` },
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": `${SITE_URL}/busca?q={search_term_string}`
                  },
                  "query-input": "required name=search_term_string"
                }
              },
              {
                "@type": "Organization",
                "@id": `${SITE_URL}/#organization`,
                "name": "Sumulando",
                "url": SITE_URL,
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://horizons-cdn.hostinger.com/d74f9542-f4b8-44ac-931b-e7d3b882cbac/19ab7e2e664db850bc6e313bf2b5dcdb.jpg",
                  "width": 1200,
                  "height": 630
                },
                "description": "Plataforma de pesquisa de súmulas e enunciados dos principais tribunais brasileiros."
              },
              {
                "@type": "WebPage",
                "@id": `${SITE_URL}/#webpage`,
                "url": SITE_URL,
                "name": "Sumulando - Busca de Súmulas e Enunciados Judiciais",
                "isPartOf": { "@id": `${SITE_URL}/#website` },
                "about": { "@id": `${SITE_URL}/#organization` },
                "description": "Encontre súmulas e enunciados dos principais tribunais brasileiros: STF, STJ, STM, TST e TSE. Busca rápida e organizada.",
                "inLanguage": "pt-BR"
              }
            ]
          })}
        </script>
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

      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-indigo-600/10" />
        
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 w-full max-w-4xl"
        >
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-center justify-center mb-6"
            >
              <Scale className="w-16 h-16 text-blue-600" />
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4"
            >
              Sumulando
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xl text-gray-600"
            >
              Busca inteligente de súmulas e enunciados judiciais
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20"
          >
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Buscar por termos, súmulas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-12 h-14 text-lg rounded-xl border-2 border-gray-200 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <MultiSelectCombobox
                    options={tribunalOptions}
                    value={selectedTribunais}
                    onValueChange={setSelectedTribunais}
                    placeholder="Tribunais"
                    className="h-14"
                />
                
                <MultiSelectCombobox
                    options={topicOptions}
                    value={selectedTopics}
                    onValueChange={setSelectedTopics}
                    placeholder="Tópicos"
                    className="h-14"
                />

              </div>

              <Button
                onClick={handleSearch}
                className="w-full h-14 text-lg rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Search className="w-5 h-5 mr-2" />
                Buscar Súmulas
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-8"
          >
            <p className="text-gray-600">
              {sumulasCount ? `Acesse mais de ${sumulasCount.toLocaleString('pt-BR')} súmulas` : 'Acesse milhares de súmulas'} dos principais tribunais brasileiros
            </p>
          </motion.div>


        </motion.div>
      </div>
    </>
  );
};

export default HomePage;