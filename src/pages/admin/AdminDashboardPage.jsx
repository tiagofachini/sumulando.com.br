import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Tag, Landmark, ArrowRight, HelpCircle, MessageSquare, CheckSquare, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import CoverageMonitor from '@/components/admin/CoverageMonitor';

const AdminDashboardPage = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({ sumulas: 0, topicos: 0, tribunais: 0, faqs: 0 });
  const [feedbackStats, setFeedbackStats] = useState({ novo: 0, lido: 0, resolvido: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
        const [
          { count: sumulasCount, error: sumulasError },
          { count: topicosCount },
          { count: tribunaisCount, error: tribunaisError },
          { count: faqsCount },
          { data: feedbackData, error: feedbackError },
        ] = await Promise.all([
          supabase.from('sumulas').select('*', { count: 'exact', head: true }),
          supabase.from('topicos').select('*', { count: 'exact', head: true }),
          supabase.from('tribunais').select('*', { count: 'exact', head: true }),
          supabase.from('faqs').select('*', { count: 'exact', head: true }),
          supabase.rpc('get_feedback_stats').single(),
        ]);

        if (sumulasError) throw sumulasError;
        if (tribunaisError) throw tribunaisError;
        if (feedbackError) throw feedbackError;

        setStats({ sumulas: sumulasCount || 0, topicos: topicosCount || 0, tribunais: tribunaisCount || 0, faqs: faqsCount || 0 });
        setFeedbackStats(feedbackData || { novo: 0, lido: 0, resolvido: 0 });
      } catch (error) {
        toast({ title: 'Erro ao carregar dados', description: error.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const statCards = [
    { name: 'Súmulas Cadastradas',  icon: FileText,    to: '/admfachini/sumulas',   count: stats.sumulas,   color: 'from-blue-500 to-indigo-500' },
    { name: 'Tópicos Criados',      icon: Tag,         to: '/admfachini/topicos',   count: stats.topicos,   color: 'from-purple-500 to-pink-500' },
    { name: 'Tribunais Ativos',     icon: Landmark,    to: '/admfachini/tribunais', count: stats.tribunais, color: 'from-teal-500 to-cyan-500' },
    { name: 'FAQs Cadastradas',     icon: HelpCircle,  to: '/admfachini/faqs',      count: stats.faqs,      color: 'from-amber-500 to-orange-500' },
  ];

  const feedbackCards = [
    { name: 'Feedbacks Novos',      icon: Inbox,        to: '/admfachini/feedbacks?status=novo',      count: feedbackStats.novo,      color: 'from-red-500 to-rose-500' },
    { name: 'Feedbacks Lidos',      icon: MessageSquare, to: '/admfachini/feedbacks?status=lido',     count: feedbackStats.lido,      color: 'from-yellow-500 to-amber-500' },
    { name: 'Feedbacks Resolvidos', icon: CheckSquare,  to: '/admfachini/feedbacks?status=resolvido', count: feedbackStats.resolvido, color: 'from-green-500 to-emerald-500' },
  ];

  const StatCard = ({ stat, index, linkLabel }) => (
    <motion.div
      key={stat.name}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="bg-white/80 backdrop-blur-xl shadow-lg border-white/20 hover:shadow-xl transition-shadow duration-300 rounded-2xl overflow-hidden">
        <CardHeader className={`bg-gradient-to-br ${stat.color} p-6 flex flex-row items-center justify-between`}>
          <stat.icon className="w-8 h-8 text-white/80" />
          <CardTitle className="text-white text-4xl font-extrabold">{loading ? '...' : stat.count}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">{stat.name}</h3>
          <Link to={stat.to} className="flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            {linkLabel}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-600 mt-2">Resumo do conteúdo e cobertura por tribunal.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => <StatCard key={stat.name} stat={stat} index={i} linkLabel="Gerenciar" />)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {feedbackCards.map((stat, i) => <StatCard key={stat.name} stat={stat} index={i + 4} linkLabel="Ver Feedbacks" />)}
      </div>

      <CoverageMonitor />
    </div>
  );
};

export default AdminDashboardPage;
