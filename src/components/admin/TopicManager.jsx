import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit, Save, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const TopicManager = () => {
  const { toast } = useToast();
  const [topics, setTopics] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicName, setTopicName] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadTopics = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
        const { data, error } = await supabase.from('topicos').select('*').order('name');
        if (error) throw error;
        setTopics(data);
    } catch (error) {
        console.error("Error loading topics:", error);
        toast({ title: "Erro ao Carregar Tópicos", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const resetForm = () => {
    setIsFormVisible(false);
    setEditingTopic(null);
    setTopicName('');
  };

  const handleAddNew = () => {
    resetForm();
    setIsFormVisible(true);
  };

  const handleEdit = (topic) => {
    setEditingTopic(topic);
    setTopicName(topic.name);
    setIsFormVisible(true);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!topicName.trim()) {
      toast({
        title: "Erro",
        description: "O nome do tópico não pode ser vazio.",
        variant: "destructive",
      });
      return;
    }
    
    try {
        if (editingTopic) {
          const { error } = await supabase.from('topicos').update({ name: topicName.trim() }).eq('id', editingTopic.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('topicos').insert({ name: topicName.trim() });
          if (error) throw error;
        }

        toast({
          title: "Sucesso!",
          description: editingTopic ? "Tópico atualizado!" : "Tópico criado!",
        });
        resetForm();
        loadTopics();
    } catch(error) {
        if (error.code === '23505') { // unique_violation
            toast({ title: "Erro", description: "Este tópico já existe.", variant: "destructive" });
        } else {
            toast({ title: "Erro ao Salvar", description: error.message, variant: "destructive" });
        }
    }
  };

  const handleDelete = async (topicId) => {
    try {
        const { data, error: checkError } = await supabase
            .from('sumula_topicos')
            .select('sumula_id', { count: 'exact' })
            .eq('topico_id', topicId);
        
        if (checkError) throw checkError;

        if (data.length > 0) {
            toast({
                title: "Ação não permitida",
                description: `Este tópico está associado a ${data.length} súmula(s) e não pode ser removido.`,
                variant: "destructive",
            });
            return;
        }

        const { error } = await supabase.from('topicos').delete().eq('id', topicId);
        if (error) throw error;
        
        toast({
          title: "Tópico removido",
          description: "O tópico foi removido com sucesso.",
        });
        loadTopics();
    } catch (error) {
         toast({ title: "Erro ao Remover", description: error.message, variant: "destructive" });
    }
  };

  const filteredTopics = useMemo(() => {
    return topics.filter(topic => 
      topic.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [topics, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Gerenciar Tópicos
        </h2>
        <Button
          onClick={handleAddNew}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Tópico
        </Button>
      </div>

      {isFormVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20 overflow-hidden"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {editingTopic ? 'Editar Tópico' : 'Novo Tópico'}
            </h2>
            <Button variant="outline" onClick={resetForm}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 font-semibold mb-2 block">
                Nome do Tópico
              </Label>
              <Input
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="Ex: Direito Civil, Direito Penal..."
                className="h-12 rounded-xl border-2"
              />
            </div>
            <Button
              onClick={handleSubmit}
              className="w-full h-12 text-lg rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Save className="w-5 h-5 mr-2" />
              {editingTopic ? 'Atualizar Tópico' : 'Salvar Tópico'}
            </Button>
          </div>
        </motion.div>
      )}

      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Tópicos Cadastrados ({filteredTopics.length})
        </h2>
        <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar por nome do tópico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
        </div>

        {loading ? (
            <div className="text-center py-12 text-gray-500">Carregando tópicos...</div>
        ) : (
            <div className="space-y-4">
                {filteredTopics.map((cat) => (
                <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/90 rounded-xl shadow p-4 border border-gray-100 flex justify-between items-center"
                >
                    <span className="font-medium text-gray-700">{cat.name}</span>
                    <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(cat)}
                        className="hover:bg-blue-100"
                    >
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(cat.id)}
                        className="hover:bg-red-100 hover:text-red-600"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                    </div>
                </motion.div>
                ))}
                {filteredTopics.length === 0 && !isFormVisible && (
                <div className="text-center py-12 text-gray-500">
                    Nenhum tópico encontrado com os filtros aplicados.
                </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default TopicManager;