import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit, Save, X, Search, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { slugify } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';

const TribunalManager = () => {
  const { toast } = useToast();
  const [tribunais, setTribunais] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    official_url: '',
    expected_count: '',
    sumula_url_template: '',
  });

  const loadData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
        const { data, error } = await supabase.from('tribunais').select('*').order('name');
        if (error) throw error;
        setTribunais(data);
    } catch (error) {
        console.error("Error loading tribunais:", error);
        toast({ title: "Erro ao Carregar Tribunais", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormData({ id: '', name: '', official_url: '', expected_count: '', sumula_url_template: '' });
    setIsFormVisible(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Erro", description: "O nome do tribunal é obrigatório", variant: "destructive" });
      return;
    }

    const tribunalData = {
      id: editingId || slugify(formData.name),
      name: formData.name.trim(),
      official_url: formData.official_url?.trim() || null,
      expected_count: formData.expected_count ? parseInt(formData.expected_count) : null,
      sumula_url_template: formData.sumula_url_template?.trim() || null,
    };

    try {
        if (editingId) {
            const { error } = await supabase.from('tribunais').update({
              name: tribunalData.name,
              official_url: tribunalData.official_url,
              expected_count: tribunalData.expected_count,
              sumula_url_template: tribunalData.sumula_url_template,
            }).eq('id', editingId);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('tribunais').insert(tribunalData);
            if (error) throw error;
        }
        toast({ title: "Sucesso!", description: editingId ? "Tribunal atualizado!" : "Tribunal cadastrado!" });
        resetForm();
        loadData();
    } catch (error) {
        if (error.code === '23505') { // unique_violation
            toast({ title: "Erro", description: "Já existe um tribunal com esse ID.", variant: "destructive" });
        } else {
            toast({ title: "Erro ao Salvar", description: error.message, variant: "destructive" });
        }
    }
  };

  const handleDelete = async (id) => {
    try {
        const { data, error: checkError } = await supabase.from('sumulas').select('id', { count: 'exact' }).eq('tribunal_id', id);
        if (checkError) throw checkError;

        if (data.length > 0) {
            toast({ title: "Ação não permitida", description: `Este tribunal está associado a ${data.length} súmula(s) e não pode ser removido.`, variant: "destructive" });
            return;
        }

        const { error } = await supabase.from('tribunais').delete().eq('id', id);
        if (error) throw error;
        
        toast({ title: "Tribunal removido", description: "O tribunal foi removido com sucesso" });
        loadData();
    } catch (error) {
        toast({ title: "Erro ao Remover", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (tribunal) => {
    setFormData({
      id: tribunal.id,
      name: tribunal.name,
      official_url: tribunal.official_url || '',
      expected_count: tribunal.expected_count ?? '',
      sumula_url_template: tribunal.sumula_url_template || '',
    });
    setEditingId(tribunal.id);
    setIsFormVisible(true);
    window.scrollTo(0, 0);
  };

  const handleAddNew = () => {
    resetForm();
    setIsFormVisible(true);
  }

  const filteredTribunais = useMemo(() => {
    return tribunais.filter(tribunal => 
      tribunal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tribunal.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tribunais, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Gerenciar Tribunais
        </h2>
        <Button
          onClick={handleAddNew}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Tribunal
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
              {editingId ? 'Editar Tribunal' : 'Novo Tribunal'}
            </h2>
            <Button variant="outline" onClick={resetForm}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 font-semibold mb-2 block">
                Nome do Tribunal *
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Supremo Tribunal Federal"
                className="h-12 rounded-xl border-2"
              />
               <p className="text-xs text-gray-500 mt-1">O ID será gerado automaticamente com base no nome (ex: `supremo-tribunal-federal`) se não for um registro existente.</p>
            </div>

            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-semibold text-gray-700 mb-3">Configurações do Monitor de Cobertura</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-gray-700 font-semibold mb-2 block">URL Oficial</Label>
                  <Input
                    value={formData.official_url}
                    onChange={(e) => setFormData({ ...formData, official_url: e.target.value })}
                    placeholder="https://portal.stf.jus.br/jurisprudencia/listarSumula.asp"
                    className="h-10 rounded-xl border-2"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-semibold mb-2 block">Total de Súmulas Esperado</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.expected_count}
                    onChange={(e) => setFormData({ ...formData, expected_count: e.target.value })}
                    placeholder="Ex: 759"
                    className="h-10 rounded-xl border-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-gray-700 font-semibold mb-2 block">Template de URL por Número</Label>
                  <Input
                    value={formData.sumula_url_template}
                    onChange={(e) => setFormData({ ...formData, sumula_url_template: e.target.value })}
                    placeholder="https://portal.stf.jus.br/sumulas/verSumula.asp?numero={n}"
                    className="h-10 rounded-xl border-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use <code className="bg-gray-100 px-1 rounded">{'{n}'}</code> como placeholder para o número da súmula.</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full h-12 text-lg rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Save className="w-5 h-5 mr-2" />
              {editingId ? 'Atualizar Tribunal' : 'Salvar Tribunal'}
            </Button>
          </div>
        </motion.div>
      )}

      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Tribunais Cadastrados ({filteredTribunais.length})
        </h2>
        <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
        </div>

        {loading ? (
            <div className="text-center py-12 text-gray-500">Carregando tribunais...</div>
        ) : (
            <div className="space-y-4">
                {filteredTribunais.map((tribunal) => (
                <motion.div
                    key={tribunal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/90 rounded-xl shadow p-4 border border-gray-100 flex justify-between items-center"
                >
                    <div>
                    <p className="font-bold text-gray-800">{tribunal.name}</p>
                    <p className="text-sm text-gray-500">ID: {tribunal.id}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {tribunal.expected_count > 0 && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {tribunal.expected_count} esperadas
                        </span>
                      )}
                      {tribunal.official_url && (
                        <a href={tribunal.official_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Fonte oficial
                        </a>
                      )}
                    </div>
                    </div>
                    <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(tribunal)} className="hover:bg-blue-100">
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(tribunal.id)} className="hover:bg-red-100 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                    </div>
                </motion.div>
                ))}
                {filteredTribunais.length === 0 && !isFormVisible && (
                <div className="text-center py-12 text-gray-500">
                    Nenhum tribunal encontrado com os filtros aplicados.
                </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default TribunalManager;