import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trash2, ExternalLink, Search, Edit, PlusCircle, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import FeedbackForm from '@/components/admin/FeedbackForm';
import { Link } from 'react-router-dom';

const ManageFeedbacksPage = () => {
    const { toast } = useToast();
    const [feedbacks, setFeedbacks] = useState([]);
    const [sumulas, setSumulas] = useState([]);
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingFeedback, setEditingFeedback] = useState(null);

    const loadData = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('search_feedbacks', {
                p_search_term: searchTerm || '',
                p_status: statusFilter,
            });

            if (error) throw error;
            setFeedbacks(data || []);

            // Only fetch sumulas/faqs for the form if it's open
            if (isFormOpen) {
                const [sumulasRes, faqsRes] = await Promise.all([
                    supabase.from('sumulas').select('id, title').order('title'),
                    supabase.from('faqs').select('id, question, sumula_id').order('question')
                ]);
                if (sumulasRes.error) throw sumulasRes.error;
                if (faqsRes.error) throw faqsRes.error;
                setSumulas(sumulasRes.data || []);
                setFaqs(faqsRes.data || []);
            }
        } catch (error) {
            console.error("Failed to load data:", error);
            toast({
                title: "Erro ao carregar dados",
                description: `Não foi possível buscar os dados: ${error.message}`,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [toast, searchTerm, statusFilter, isFormOpen]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleOpenForm = async (feedback = null) => {
        setEditingFeedback(feedback);
        // Pre-load sumulas and faqs for the form
        try {
            const [sumulasRes, faqsRes] = await Promise.all([
                supabase.from('sumulas').select('id, title').order('title'),
                supabase.from('faqs').select('id, question, sumula_id').order('question')
            ]);
            if (sumulasRes.error) throw sumulasRes.error;
            if (faqsRes.error) throw faqsRes.error;
            setSumulas(sumulasRes.data || []);
            setFaqs(faqsRes.data || []);
        } catch (error) {
            toast({ title: 'Erro ao preparar formulário', description: error.message, variant: 'destructive'});
        }
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingFeedback(null);
    };

    const handleSaveFeedback = async (formData) => {
        try {
            let response;
            if (editingFeedback) {
                // Update
                response = await supabase.from('feedbacks').update(formData).eq('id', editingFeedback.id).select().single();
            } else {
                // Create
                response = await supabase.from('feedbacks').insert(formData).select().single();
            }

            const { data, error } = response;
            if (error) throw error;
            
            toast({
                title: `Feedback ${editingFeedback ? 'atualizado' : 'criado'}!`,
                description: `O feedback foi salvo com sucesso.`,
            });
            
            handleCloseForm();
            loadData(); // Recarrega para mostrar as alterações

        } catch (error) {
            console.error('Error saving feedback:', error);
            toast({
                title: 'Erro ao salvar',
                description: `Não foi possível salvar o feedback: ${error.message}`,
                variant: 'destructive',
            });
        }
    };

    const handleDelete = async (id) => {
        const confirmed = window.confirm("Tem certeza que deseja excluir este feedback?");
        if (!confirmed) return;

        try {
            const { error } = await supabase.from('feedbacks').delete().eq('id', id);
            if (error) throw error;
            loadData();
            toast({ title: "Feedback removido", description: "O feedback foi excluído com sucesso." });
        } catch (error) {
            console.error("Error deleting feedback:", error);
            toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            const { error } = await supabase.from('feedbacks').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
            
            setFeedbacks(prev => prev.map(fb => fb.id === id ? {...fb, status: newStatus} : fb));

            toast({ title: "Status atualizado", description: "O status do feedback foi alterado." });
        } catch (error) {
            console.error("Error updating status:", error);
            toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        }
    };
    
    const statusVariant = {
        'novo': 'default',
        'lido': 'secondary',
        'resolvido': 'outline',
    };

    const getStatusVariant = (status) => {
        return statusVariant[status] || 'secondary';
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-800">
                    Gerenciar Feedbacks
                </h1>
                <Button onClick={() => handleOpenForm()} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Feedback
                </Button>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Feedbacks Recebidos ({feedbacks.length})
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                        placeholder="Buscar por conteúdo, súmula, ou FAQ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-12"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-12"><SelectValue placeholder="Filtrar por status" /></SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="novo">Novo</SelectItem>
                        <SelectItem value="lido">Lido</SelectItem>
                        <SelectItem value="resolvido">Resolvido</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Carregando feedbacks...</div>
                ) : feedbacks.length > 0 ? (
                    <div className="space-y-4">
                        {feedbacks.map((feedback, index) => (
                            <motion.div
                                key={feedback.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white/90 rounded-xl shadow p-4 border border-gray-100"
                            >
                                <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                                    <div className="flex-1 pr-4">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                             <Select value={feedback.status} onValueChange={(newStatus) => handleStatusChange(feedback.id, newStatus)}>
                                                <SelectTrigger className="w-[120px] h-7 text-xs">
                                                    <SelectValue>
                                                        <Badge variant={getStatusVariant(feedback.status)}>{feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1)}</Badge>
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="novo">Novo</SelectItem>
                                                    <SelectItem value="lido">Lido</SelectItem>
                                                    <SelectItem value="resolvido">Resolvido</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            
                                            {feedback.sumula_title && (
                                                <Link to={`/sumula/${feedback.sumula_slug}`} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1 text-sm font-semibold">
                                                    {feedback.sumula_title}
                                                    <ExternalLink className="w-3 h-3"/>
                                                </Link>
                                            )}

                                            {feedback.faq_question && (
                                                <span className="text-gray-500 flex items-center gap-1 text-sm font-semibold italic ml-2">
                                                    <FileQuestion className="w-3 h-3"/>
                                                    {`FAQ: "${feedback.faq_question}"`}
                                                </span>
                                            )}

                                            {!feedback.sumula_title && !feedback.faq_question && (
                                                <span className="text-gray-500 italic text-sm font-semibold">Feedback geral</span>
                                            )}
                                        </div>
                                        <p className="text-gray-700 text-sm mt-2">{feedback.content}</p>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Recebido em: {new Date(feedback.created_at).toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleOpenForm(feedback)} className="hover:bg-blue-100">
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleDelete(feedback.id)} className="hover:bg-red-100 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        Nenhum feedback encontrado.
                    </div>
                )}
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                        <DialogTitle>{editingFeedback ? 'Editar Feedback' : 'Adicionar Novo Feedback'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <FeedbackForm 
                            feedback={editingFeedback} 
                            onSave={handleSaveFeedback} 
                            onCancel={handleCloseForm}
                            sumulas={sumulas}
                            faqs={faqs}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ManageFeedbacksPage;