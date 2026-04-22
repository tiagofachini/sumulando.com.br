import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Send } from 'lucide-react';

const CommentsSection = ({ sumulaId }) => {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) {
      toast({
        title: "Campo vazio",
        description: "Por favor, escreva seu feedback antes de enviar.",
        variant: "destructive",
      });
      return;
    }
    
    if (!sumulaId) {
        toast({
            title: "Erro",
            description: "Não foi possível identificar a súmula para enviar o feedback.",
            variant: "destructive",
        });
        return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('feedbacks').insert({
        content: feedback,
        sumula_id: sumulaId,
        status: 'novo',
      });

      if (error) throw error;

      toast({
        title: "Feedback enviado!",
        description: "Obrigado por sua contribuição. Sua opinião é muito importante!",
      });
      setFeedback('');
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar seu feedback. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/20 mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Encontrou um erro ou tem uma sugestão?</h2>
      <p className="text-gray-600 mb-4">
        Sua opinião é fundamental para aprimorarmos a plataforma. Deixe seu feedback abaixo.
      </p>
      <div className="space-y-4">
        <Textarea
          placeholder="Digite seu feedback aqui..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="h-32 bg-white/80"
          disabled={isSubmitting}
        />
        <Button onClick={handleFeedbackSubmit} disabled={isSubmitting} className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300">
           <Send className="w-5 h-5 mr-2" />
          {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
        </Button>
      </div>
    </div>
  );
};

export default CommentsSection;