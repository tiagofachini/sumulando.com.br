import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/Combobox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const FaqForm = ({ faq, sumulas, onSave, onCancel, initialSumulaId }) => {
  const [question, setQuestion] = useState(faq?.question || '');
  const [answer, setAnswer] = useState(faq?.answer || '');
  const [sumulaId, setSumulaId] = useState(faq?.sumula_id || initialSumulaId || '');
  const { toast } = useToast();

  const sumulaOptions = sumulas.map(s => ({
    value: s.id,
    label: `${s.title} (${s.tribunais?.name || 'N/A'})`
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sumulaId) {
      toast({ title: 'Campo obrigatório', description: 'Por favor, selecione uma súmula.', variant: 'destructive' });
      return;
    }
    onSave({ id: faq?.id, question, answer, sumula_id: sumulaId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div>
        <Label htmlFor="sumula">Súmula *</Label>
        <Combobox
          options={sumulaOptions}
          value={sumulaId}
          onValueChange={setSumulaId}
          placeholder="Selecione a súmula..."
          searchPlaceholder="Buscar súmula..."
          className="w-full mt-1"
        />
      </div>
      <div>
        <Label htmlFor="question">Pergunta *</Label>
        <Input
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="answer">Resposta *</Label>
        <Textarea
          id="answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          required
          className="mt-1"
        />
      </div>
      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </DialogFooter>
    </form>
  );
};

const ManageFaqsPage = () => {
  const [faqs, setFaqs] = useState([]);
  const [sumulas, setSumulas] = useState([]);
  const [sumulasWithoutFaqs, setSumulasWithoutFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showWithoutFaqs, setShowWithoutFaqs] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedFaq, setSelectedFaq] = useState(null);
  const [initialSumulaIdForForm, setInitialSumulaIdForForm] = useState(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    if (showWithoutFaqs) {
      let query = supabase
        .from('sumulas')
        .select(`
          id, title, slug,
          tribunais ( name ),
          faqs ( id )
        `)
        .order('title', { ascending: true });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,tribunais.name.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        toast({ title: 'Erro ao buscar Súmulas', description: error.message, variant: 'destructive' });
      } else {
        setSumulasWithoutFaqs(data.filter(s => s.faqs.length === 0));
      }
    } else {
      let query = supabase
        .from('faqs')
        .select(`*, sumulas(title, slug, tribunais(name))`)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`question.ilike.%${searchTerm}%,answer.ilike.%${searchTerm}%,sumulas.title.ilike.%${searchTerm}%`);
      }
      const { data, error } = await query;
      if (error) {
        toast({ title: 'Erro ao buscar FAQs', description: error.message, variant: 'destructive' });
      } else {
        setFaqs(data || []);
      }
    }
    setLoading(false);
  }, [searchTerm, toast, showWithoutFaqs]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchSumulasForForm = async () => {
      if (!supabase) return;
      const { data, error } = await supabase.from('sumulas').select('id, title, tribunais(name)').order('title');
      if (error) {
        toast({ title: 'Erro ao buscar súmulas', description: error.message, variant: 'destructive' });
      } else {
        setSumulas(data || []);
      }
    };
    if (isFormOpen) {
      fetchSumulasForForm();
    }
  }, [isFormOpen, toast]);

  const handleSave = async (faqData) => {
    if (!supabase || !faqData.sumula_id) {
        toast({ title: 'Erro de Validação', description: 'É necessário selecionar uma súmula.', variant: 'destructive' });
        return;
    }

    if (!faqData.id) {
      const { count, error: countError } = await supabase
        .from('faqs')
        .select('*', { count: 'exact', head: true })
        .eq('sumula_id', faqData.sumula_id);
      
      if (countError) {
         toast({ title: 'Erro ao verificar limite de FAQs', description: countError.message, variant: 'destructive' });
         return;
      }
      if (count >= 3) {
        toast({ title: 'Limite de FAQs atingido', description: 'Cada súmula pode ter no máximo 3 FAQs.', variant: 'destructive' });
        return;
      }
    }

    const { error } = await supabase.from('faqs').upsert({ id: faqData.id, question: faqData.question, answer: faqData.answer, sumula_id: faqData.sumula_id });

    if (error) {
      toast({ title: 'Erro ao salvar FAQ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `FAQ ${faqData.id ? 'atualizado' : 'criado'} com sucesso!` });
      setIsFormOpen(false);
      setSelectedFaq(null);
      setInitialSumulaIdForForm(null);
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!supabase || !selectedFaq) return;
    const { error } = await supabase.from('faqs').delete().eq('id', selectedFaq.id);
    if (error) {
      toast({ title: 'Erro ao deletar FAQ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'FAQ deletado com sucesso!' });
      setIsDeleteAlertOpen(false);
      setSelectedFaq(null);
      fetchData();
    }
  };

  const handleOpenForm = (faq = null, sumulaId = null) => {
    setSelectedFaq(faq);
    setInitialSumulaIdForForm(sumulaId);
    setIsFormOpen(true);
  };

  const handleOpenDeleteAlert = (faq) => {
    setSelectedFaq(faq);
    setIsDeleteAlertOpen(true);
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800">
          Gerenciar FAQs
        </h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenForm()} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar FAQ
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{selectedFaq ? 'Editar' : 'Adicionar'} FAQ</DialogTitle>
              <DialogDescription>Preencha as informações abaixo.</DialogDescription>
            </DialogHeader>
            <FaqForm
              faq={selectedFaq}
              sumulas={sumulas}
              onSave={handleSave}
              onCancel={() => {
                setIsFormOpen(false);
                setSelectedFaq(null);
                setInitialSumulaIdForForm(null);
              }}
              initialSumulaId={initialSumulaIdForForm}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {showWithoutFaqs ? `Súmulas sem FAQ (${sumulasWithoutFaqs.length})` : `FAQs Cadastrados (${faqs.length})`}
        </h2>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder={showWithoutFaqs ? "Buscar por título ou tribunal..." : "Buscar por pergunta, resposta ou súmula..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <div className="flex items-center space-x-3 bg-gray-100 p-3 rounded-lg">
            <Checkbox id="show-without-faqs" checked={showWithoutFaqs} onCheckedChange={(checked) => { setSearchTerm(''); setShowWithoutFaqs(checked); }} />
            <Label htmlFor="show-without-faqs" className="font-medium text-gray-700 cursor-pointer">
              Mostrar apenas Súmulas sem FAQ
            </Label>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Carregando...</div>
        ) : (
          <div className="space-y-4">
            {showWithoutFaqs ? (
                sumulasWithoutFaqs.length > 0 ? (
                sumulasWithoutFaqs.map((sumula) => (
                    <motion.div
                        key={sumula.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/90 rounded-xl shadow p-4 border border-gray-100 flex items-center justify-between gap-4"
                    >
                        <div className="flex-1">
                            <Badge variant="secondary" className="mb-2">{sumula.tribunais.name}</Badge>
                            <Link to={`/sumula/${sumula.slug}`} target="_blank">
                                <h3 className="font-bold text-gray-800 hover:text-blue-600 transition-colors">{sumula.title}</h3>
                            </Link>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleOpenForm(null, sumula.id)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar FAQ
                        </Button>
                    </motion.div>
                ))
                ) : (
                <div className="text-center py-12 text-gray-500">Nenhuma súmula sem FAQ encontrada.</div>
                )
            ) : (
                faqs.length > 0 ? (
                faqs.map((faq) => (
                    <motion.div
                        key={faq.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/90 rounded-xl shadow p-4 border border-gray-100 flex items-start justify-between gap-4"
                    >
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-800 mb-1">{faq.question}</h3>
                            <p className="text-gray-600 text-sm line-clamp-2 mb-3">{faq.answer}</p>
                            {faq.sumulas && (
                                <Link to={`/sumula/${faq.sumulas.slug}`} target="_blank" className="inline-block">
                                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                                        {faq.sumulas.title}
                                    </Badge>
                                </Link>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleOpenForm(faq)} className="hover:bg-blue-100"><Edit className="w-4 h-4" /></Button>
                            <Button size="sm" variant="outline" onClick={() => handleOpenDeleteAlert(faq)} className="hover:bg-red-100 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                    </motion.div>
                ))
                ) : (
                <div className="text-center py-12 text-gray-500">Nenhum FAQ encontrado.</div>
                )
            )}
            </div>
        )}
      </div>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar permanentemente o FAQ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedFaq(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageFaqsPage;