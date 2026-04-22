import React from 'react';
import { motion } from 'framer-motion';
import { Save, X, Link2, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { MultiSelectCombobox } from '@/components/MultiSelectCombobox';
import { supabase } from '@/lib/supabaseClient';

const SumulaForm = ({
  formData,
  setFormData,
  tribunais,
  categories,
  editingId,
  onSave,
  onCancel,
  onTopicCreated
}) => {
  const { toast } = useToast();
  
  const topicOptions = React.useMemo(() => categories.map(cat => ({
    value: cat.id,
    label: cat.name
  })), [categories]);

  const selectedTopics = React.useMemo(() => topicOptions.filter(option => formData.categories.includes(option.value)), [topicOptions, formData.categories]);

  const handleTopicChange = (selectedOptions) => {
    const selectedIds = selectedOptions.map(opt => opt.value);
    setFormData(prev => ({
        ...prev,
        categories: selectedIds
    }));
  };

  const handleCreateTopic = async (topicName) => {
    const trimmedName = topicName.trim();
    if (!trimmedName) {
      toast({ title: "Erro", description: "O nome do tópico não pode estar vazio.", variant: "destructive" });
      return;
    }
    if (categories.some(cat => cat.name.toLowerCase() === trimmedName.toLowerCase())) {
      const existingTopic = categories.find(cat => cat.name.toLowerCase() === trimmedName.toLowerCase());
      if (existingTopic && !formData.categories.includes(existingTopic.id)) {
         setFormData(prev => ({ ...prev, categories: [...prev.categories, existingTopic.id] }));
         toast({ title: "Tópico Adicionado", description: `O tópico "${existingTopic.name}" já existia e foi selecionado.` });
      } else {
         toast({ title: "Tópico já selecionado", description: `O tópico "${trimmedName}" já está na lista.`, variant: "default" });
      }
      return;
    }

    try {
        const { data, error } = await supabase.from('topicos').insert({ name: trimmedName }).select().single();
        if (error) throw error;

        onTopicCreated(data); 

        setFormData(prev => ({
          ...prev,
          categories: [...prev.categories, data.id]
        }));
        
        toast({ title: "Sucesso!", description: `Tópico "${data.name}" criado e selecionado.` });

    } catch(error) {
        toast({ title: "Erro ao criar tópico", description: error.message, variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -20, height: 0 }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20 mb-6 relative z-10"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {editingId ? 'Editar Súmula' : 'Nova Súmula'}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-gray-600 hover:bg-gray-200"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-gray-700 font-semibold mb-2 block">
            Título *
          </Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Súmula 123"
            className="h-12 rounded-xl border-2"
          />
        </div>

        {editingId && (
          <div className="relative">
            <Label className="text-gray-700 font-semibold mb-2 block">
                Link (Slug) *
            </Label>
             <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="Ex: sumula-123-stf"
                    className="h-12 rounded-xl border-2 pl-10"
                />
            </div>
          </div>
        )}

        <div>
          <Label className="text-gray-700 font-semibold mb-2 block">
            Conteúdo *
          </Label>
          <Textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Digite o conteúdo completo da súmula..."
            className="min-h-[200px] rounded-xl border-2"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-700 font-semibold mb-2 block">
              Data de Publicação *
            </Label>
            <Input
              type="date"
              value={formData.publishDate}
              onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
              className="h-12 rounded-xl border-2"
            />
          </div>

          <div>
            <Label className="text-gray-700 font-semibold mb-2 block">
              Link de Referência
            </Label>
            <Input
              value={formData.referenceLink}
              onChange={(e) => setFormData({ ...formData, referenceLink: e.target.value })}
              placeholder="https://..."
              className="h-12 rounded-xl border-2"
            />
          </div>
        </div>

        <div>
          <Label className="text-gray-700 font-semibold mb-2 block">
            <Youtube className="inline-block w-5 h-5 mr-2 text-red-600" />
            Vídeo do YouTube (opcional)
          </Label>
          <Input
            value={formData.youtubeUrl || ''}
            onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            className="h-12 rounded-xl border-2"
          />
          <p className="text-xs text-gray-500 mt-1">
            Cole o link completo do vídeo do YouTube. Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ
          </p>
        </div>

        <div>
          <Label className="text-gray-700 font-semibold mb-2 block">
            Tribunal *
          </Label>
          <Select
            value={formData.tribunal}
            onValueChange={(value) => setFormData({ ...formData, tribunal: value })}
          >
            <SelectTrigger className="h-12 rounded-xl border-2">
              <SelectValue placeholder="Selecione o tribunal" />
            </SelectTrigger>
            <SelectContent>
              {tribunais.map(trib => (
                <SelectItem key={trib.id} value={trib.id}>
                  {trib.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          <Label className="text-gray-700 font-semibold mb-3 block">
            Tópicos
          </Label>
          <MultiSelectCombobox
            options={topicOptions}
            value={selectedTopics}
            onValueChange={handleTopicChange}
            onCreate={handleCreateTopic}
            placeholder="Selecione ou crie tópicos..."
            className="w-full"
          />
        </div>

        <Button
          onClick={onSave}
          className="w-full h-12 text-lg rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Save className="w-5 h-5 mr-2" />
          {editingId ? 'Atualizar Súmula' : 'Cadastrar Súmula'}
        </Button>
      </div>
    </motion.div>
  );
};

export default SumulaForm;