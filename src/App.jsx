import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import HomePage from '@/pages/HomePage';
import SearchResultsPage from '@/pages/SearchResultsPage';
import SumulaDetailPage from '@/pages/SumulaDetailPage';
import InstitutionalPage from '@/pages/InstitutionalPage';
import AdminLoginPage from '@/pages/AdminLoginPage';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import ManageSumulasPage from '@/pages/admin/ManageSumulasPage';
import ManageTopicsPage from '@/pages/admin/ManageTopicsPage';
import ManageTribunaisPage from '@/pages/admin/ManageTribunaisPage';
import ManageInstitutionalPage from '@/pages/admin/ManageInstitutionalPage';
import ManageFaqsPage from '@/pages/admin/ManageFaqsPage';
import ManageFeedbacksPage from '@/pages/admin/ManageFeedbacksPage';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import { supabase } from './lib/supabaseClient';
import { useToast } from './components/ui/use-toast';


function App() {
  const { toast } = useToast();

  useEffect(() => {
    const migrateData = async () => {
      const migrationDone = localStorage.getItem('supabase_migration_v1_done');
      if (migrationDone === 'true' || !supabase) return;

      // Prevent re-running if already in progress
      if (migrationDone === 'pending') return;

      console.log('Starting data migration to Supabase...');
      localStorage.setItem('supabase_migration_v1_done', 'pending');

      try {
        // Migrate Tópicos (Categories)
        const localTopics = JSON.parse(localStorage.getItem('categories') || '[]');
        if (localTopics.length > 0) {
          const { data: existingTopics, error: fetchTopicsError } = await supabase.from('topicos').select('name');
          if (fetchTopicsError) throw fetchTopicsError;
          
          const existingTopicNames = existingTopics.map(t => t.name);
          const newTopics = localTopics
            .filter(t => t.name && !existingTopicNames.includes(t.name))
            .map(t => ({ name: t.name }));

          if (newTopics.length > 0) {
            const { error: topicError } = await supabase.from('topicos').insert(newTopics);
            if (topicError) throw topicError;
            console.log(`${newTopics.length} tópicos migrados.`);
          }
        }

        // Fetch all topics from Supabase to get their UUIDs
        const { data: allDbTopics } = await supabase.from('topicos').select('id, name');
        const topicMap = new Map(allDbTopics.map(t => [t.name, t.id]));
        const oldTopicIdMap = new Map(localTopics.map(t => [t.id, topicMap.get(t.name)]).filter(([,v]) => v));

        // Migrate Súmulas
        const localSumulas = JSON.parse(localStorage.getItem('sumulas') || '[]');
        if (localSumulas.length > 0) {
            const { data: existingSumulas, error: fetchSumulasError } = await supabase.from('sumulas').select('slug');
            if (fetchSumulasError) throw fetchSumulasError;
            const existingSumulaSlugs = existingSumulas.map(s => s.slug);
            
            for (const sumula of localSumulas) {
                 if (!existingSumulaSlugs.includes(sumula.slug)) {
                    const { error: sumulaError, data: newSumulaData } = await supabase
                        .from('sumulas')
                        .insert({
                            slug: sumula.slug,
                            title: sumula.title,
                            content: sumula.content,
                            publish_date: sumula.publishDate,
                            reference_link: sumula.referenceLink,
                            tribunal_id: sumula.tribunal,
                        })
                        .select('id')
                        .single();

                    if (sumulaError) {
                        console.error('Error inserting sumula:', sumula.title, sumulaError);
                        continue;
                    }

                    if (sumula.categories && sumula.categories.length > 0) {
                        const topicRelations = sumula.categories
                            .map(oldCatId => {
                                const newTopicId = oldTopicIdMap.get(oldCatId);
                                if (newTopicId) {
                                    return { sumula_id: newSumulaData.id, topico_id: newTopicId };
                                }
                                return null;
                            })
                            .filter(Boolean);

                        if (topicRelations.length > 0) {
                            const { error: relationError } = await supabase.from('sumula_topicos').insert(topicRelations);
                            if (relationError) console.error('Error inserting relations for sumula:', sumula.title, relationError);
                        }
                    }
                 }
            }
             console.log('Súmulas migradas.');
        }

        // REMOVED TOAST: "Migração Concluída! Seus dados foram movidos para o banco de dados."
        // toast({
        //   title: "Migração Concluída!",
        //   description: "Seus dados foram movidos para o banco de dados.",
        // });
        localStorage.setItem('supabase_migration_v1_done', 'true');
        console.log('Migration finished successfully.');
        
      } catch (error) {
        console.error("Migration failed:", error);
        localStorage.setItem('supabase_migration_v1_done', 'failed');
        toast({
          title: "Erro na Migração",
          description: `Não foi possível migrar os dados: ${error.message}`,
          variant: "destructive",
        });
      }
    };

    setTimeout(migrateData, 1000);
  }, [toast]);

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/busca" element={<SearchResultsPage />} />
            <Route path="/sumula/:slug" element={<SumulaDetailPage />} />
            <Route path="/institucional/:slug" element={<InstitutionalPage />} />
            
            <Route path="/admfachini" element={<AdminLoginPage />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="/admfachini" element={<AdminLayout />}>
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="sumulas" element={<ManageSumulasPage />} />
                <Route path="topicos" element={<ManageTopicsPage />} />
                <Route path="tribunais" element={<ManageTribunaisPage />} />
                <Route path="institucional" element={<ManageInstitutionalPage />} />
                <Route path="faqs" element={<ManageFaqsPage />} />
                <Route path="feedbacks" element={<ManageFeedbacksPage />} />
              </Route>
            </Route>

          </Routes>
        </div>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;