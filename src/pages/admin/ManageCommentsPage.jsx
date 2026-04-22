import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';

const ManageCommentsPage = () => {
  const { toast } = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao buscar comentários', description: error.message, variant: 'destructive' });
    } else {
      setComments(data);
    }
    setLoading(false);
  };
  
  const getSumulaSlug = (sumulaId) => {
    const sumulas = JSON.parse(localStorage.getItem('sumulas') || '[]');
    const sumula = sumulas.find(s => s.id === sumulaId);
    return sumula ? sumula.slug : null;
  }

  const handleDeleteComment = async (commentId) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      toast({ title: 'Erro ao deletar comentário', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Comentário removido com sucesso!' });
      fetchComments(); // Refresh list
    }
  };

  if (loading) {
    return <div className="text-center p-8">Carregando comentários...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Gerenciar Comentários ({comments.length})
      </h2>
      
      <div className="space-y-4">
        {comments.map(comment => {
          const profile = comment.profiles;
          const sumulaSlug = getSumulaSlug(comment.sumula_id);
          
          return (
            <div key={comment.id} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                    <AvatarFallback>{profile?.full_name ? profile.full_name.charAt(0) : 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">{profile?.full_name || 'Usuário Anônimo'}</p>
                      <p className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <p className="text-gray-700 mt-1">{comment.content}</p>
                    {sumulaSlug && (
                      <Link to={`/sumula/${sumulaSlug}`} target="_blank" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                        Ver na Súmula
                      </Link>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteComment(comment.id)}
                  className="hover:bg-red-100 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )
        })}
        {comments.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            Nenhum comentário para moderar
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default ManageCommentsPage;