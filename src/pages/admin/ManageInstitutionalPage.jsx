import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Save, Edit, Loader2, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const ManageInstitutionalPage = () => {
  const { toast } = useToast();
  const [pages, setPages] = useState([]);
  const [editingPage, setEditingPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPages = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('institutional_pages')
        .select('*')
        .order('created_at');
      if (error) throw error;
      setPages(data);
    } catch (error) {
      toast({
        title: 'Erro ao carregar páginas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const handleEdit = (page) => {
    setEditingPage({ ...page });
  };

  const handleCancel = () => {
    setEditingPage(null);
  };

  const handleSave = async () => {
    if (!editingPage || !editingPage.title.trim()) {
      toast({
        title: 'Erro de Validação',
        description: 'O título não pode estar vazio.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('institutional_pages')
        .update({
          title: editingPage.title,
          content: editingPage.content,
        })
        .eq('id', editingPage.id);
      if (error) throw error;
      toast({
        title: 'Sucesso!',
        description: `Página "${editingPage.title}" atualizada.`,
      });
      setEditingPage(null);
      loadPages();
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Carregando páginas...</div>;
  }

  if (editingPage) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="bg-white/80 backdrop-blur-xl shadow-lg border-white/20">
          <CardHeader>
            <CardTitle>Editando: {editingPage.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="title">Título da Página</Label>
              <Input
                id="title"
                value={editingPage.title}
                onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                className="h-12 text-lg"
              />
            </div>
            <div>
              <Label htmlFor="content">Conteúdo da Página</Label>
               <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Code className="w-4 h-4" />
                  <span>Você pode usar tags HTML para formatar o texto.</span>
                </div>
              <Textarea
                id="content"
                value={editingPage.content || ''}
                onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                rows={15}
                placeholder="Ex: <h1>Título</h1><p>Este é um parágrafo com <b>negrito</b>.</p>"
              />
            </div>
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
       <Card className="bg-white/80 backdrop-blur-xl shadow-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-gray-800">Páginas Institucionais</CardTitle>
          <CardDescription>Edite o conteúdo das páginas "Sobre", "Termos de Uso" e "Contato".</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pages.map((page) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50/80 rounded-xl shadow-inner p-4 border flex justify-between items-center"
              >
                <h3 className="text-lg font-bold text-gray-800">{page.title}</h3>
                <Button size="sm" variant="outline" onClick={() => handleEdit(page)} className="bg-white hover:bg-blue-50">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageInstitutionalPage;