import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Sparkles, Scale, Search, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const SITE_URL = 'https://sumulando.com.br';

const BuscaTesePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tese, setTese] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    const text = tese.trim();
    if (text.length < 20) {
      toast({ title: 'Texto muito curto', description: 'Descreva sua tese com pelo menos 20 caracteres.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('busca-tese', {
        body: { tese: text },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Erro desconhecido na análise.');

      const params = new URLSearchParams();
      if (data.q) params.append('q', data.q);
      (data.topicos || []).forEach((slug) => params.append('topico', slug));
      (data.tribunais || []).forEach((id) => params.append('tribunal', id));

      navigate(`/busca?${params.toString()}`);
    } catch (err) {
      toast({ title: 'Erro ao analisar tese', description: err.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Busca por Tese Jurídica — Sumulando</title>
        <meta name="description" content="Descreva sua tese jurídica e deixe a inteligência artificial encontrar as súmulas mais relevantes para o seu caso." />
        <link rel="canonical" href={`${SITE_URL}/busca-tese`} />
        <meta property="og:url" content={`${SITE_URL}/busca-tese`} />
        <meta property="og:title" content="Busca por Tese Jurídica — Sumulando" />
        <meta property="og:description" content="Descreva sua tese jurídica e deixe a inteligência artificial encontrar as súmulas mais relevantes para o seu caso." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-indigo-600/10" />

        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 w-full max-w-2xl"
        >
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-center justify-center mb-6"
            >
              <div className="relative">
                <Scale className="w-16 h-16 text-blue-600" />
                <Sparkles className="w-6 h-6 text-purple-500 absolute -top-1 -right-2" />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4"
            >
              Busca por Tese
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-lg text-gray-600"
            >
              Descreva sua tese jurídica e a IA encontra as súmulas mais relevantes
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20"
          >
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Descreva sua tese jurídica:
              </label>
              <textarea
                value={tese}
                onChange={(e) => setTese(e.target.value)}
                placeholder="Ex: O locatário pode compensar crédito de aluguéis vencidos com indenização devida pelo locador por benfeitorias realizadas no imóvel..."
                className="w-full h-40 px-4 py-3 text-base rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all resize-none bg-white/70"
                disabled={loading}
              />
              <p className="text-xs text-gray-400 text-right">{tese.length} caracteres</p>

              <Button
                onClick={handleAnalyze}
                disabled={loading || tese.trim().length < 20}
                className="w-full h-14 text-lg rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 mr-2 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Analisando tese...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Analisar Tese
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-6"
          >
            <Link
              to="/busca"
              className="text-gray-500 hover:text-gray-700 text-sm inline-flex items-center gap-1.5 transition-colors"
            >
              <Search className="w-4 h-4" />
              Prefere a busca tradicional?
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default BuscaTesePage;
