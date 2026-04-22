import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/Combobox';
import { useToast } from '@/components/ui/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const FeedbackForm = ({ feedback, onSave, onCancel, sumulas, faqs }) => {
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('novo');
  const [feedbackType, setFeedbackType] = useState('sumula'); // 'sumula' or 'faq'
  const [selectedSumulaId, setSelectedSumulaId] = useState(null);
  const [selectedFaqId, setSelectedFaqId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (feedback) {
      setContent(feedback.content || '');
      setStatus(feedback.status || 'novo');
      if (feedback.faq_id) {
        setFeedbackType('faq');
        setSelectedFaqId(feedback.faq_id);
        const faq = faqs.find(f => f.id === feedback.faq_id);
        setSelectedSumulaId(faq?.sumula_id || feedback.sumula_id || null);
      } else {
        setFeedbackType('sumula');
        setSelectedSumulaId(feedback.sumula_id || null);
        setSelectedFaqId(null);
      }
    } else {
      // Reset form for new entry
      setContent('');
      setStatus('novo');
      setFeedbackType('sumula');
      setSelectedSumulaId(null);
      setSelectedFaqId(null);
    }
  }, [feedback, faqs]);

  const sumulaOptions = useMemo(() => sumulas.map(s => ({ value: s.id, label: s.title })), [sumulas]);
  const faqOptions = useMemo(() => {
    return faqs
      .filter(f => !selectedSumulaId || f.sumula_id === selectedSumulaId)
      .map(f => ({ value: f.id, label: f.question }));
  }, [faqs, selectedSumulaId]);
  
  const handleSumulaChange = (id) => {
    setSelectedSumulaId(id);
    if(feedbackType === 'faq') {
        setSelectedFaqId(null); // Reset FAQ if sumula changes
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (feedbackType === 'sumula' && !selectedSumulaId) {
        toast({ title: "Campo obrigatório", description: "Selecione uma súmula.", variant: "destructive" });
        return;
    }
    if (feedbackType === 'faq' && !selectedFaqId) {
        toast({ title: "Campo obrigatório", description: "Selecione uma FAQ.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    await onSave({
      content,
      status,
      sumula_id: selectedSumulaId,
      faq_id: feedbackType === 'faq' ? selectedFaqId : null,
    });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="content">Conteúdo</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Digite o conteúdo do feedback"
          required
          className="h-32"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="lido">Lido</SelectItem>
              <SelectItem value="resolvido">Resolvido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tipo de Feedback</Label>
           <RadioGroup value={feedbackType} onValueChange={setFeedbackType} className="flex space-x-4 mt-2">
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="sumula" id="r_sumula" />
                <Label htmlFor="r_sumula">Súmula</Label>
            </div>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="faq" id="r_faq" />
                <Label htmlFor="r_faq">FAQ</Label>
            </div>
           </RadioGroup>
        </div>
      </div>
      
       <div>
            <Label>Súmula Associada (Obrigatório)</Label>
             <Combobox
                options={sumulaOptions}
                value={selectedSumulaId}
                onChange={handleSumulaChange}
                placeholder="Selecione uma súmula..."
                searchPlaceholder="Buscar súmula..."
            />
        </div>
        
      {feedbackType === 'faq' && (
        <div>
            <Label>FAQ Associada (Obrigatório)</Label>
            <Combobox
                options={faqOptions}
                value={selectedFaqId}
                onChange={setSelectedFaqId}
                placeholder="Selecione uma FAQ..."
                searchPlaceholder="Buscar FAQ..."
                disabled={!selectedSumulaId}
            />
            {!selectedSumulaId && <p className="text-xs text-muted-foreground mt-1">Selecione uma súmula para ver as FAQs.</p>}
        </div>
      )}


      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar Feedback'}
        </Button>
      </div>
    </form>
  );
};

export default FeedbackForm;