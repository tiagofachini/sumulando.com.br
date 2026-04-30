import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export function FeedbackDialog({ open, onOpenChange, sumulaId, sumulaTitle, sumulaSlug, faqId, faqQuestion }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const feedbackData = {
        content: data.message,
        sumula_id: sumulaId,
        faq_id: faqId,
        status: 'novo',
      };

      const { error } = await supabase.from('feedbacks').insert(feedbackData);

      if (error) throw error;

      // Fire-and-forget email notification — failure doesn't affect UX
      supabase.functions.invoke('notify-feedback', {
        body: {
          content: data.message,
          sumula_id: sumulaId,
          sumula_title: sumulaTitle,
          sumula_slug: sumulaSlug,
          faq_id: faqId,
          faq_question: faqQuestion,
        },
      }).catch((err) => console.warn('notify-feedback invoke error:', err));

      toast({
        title: "Feedback Enviado! 🎉",
        description: "Obrigado por sua contribuição. Sua mensagem foi registrada com sucesso.",
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to send feedback:", error);
      toast({
        title: "Erro ao Enviar",
        description: "Não foi possível enviar seu feedback. Por favor, tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleText = faqQuestion ? "Enviar Feedback sobre a FAQ" : "Enviar Feedback sobre a Súmula";
  const descriptionSubject = faqQuestion ? "a pergunta" : "a súmula";
  const subjectName = faqQuestion || sumulaTitle;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
          <DialogDescription>
            Ajude-nos a melhorar {descriptionSubject}: <strong className="text-foreground">{subjectName}</strong>. Seu feedback é anônimo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 items-start gap-4">
              <label htmlFor="message" className="sr-only">Mensagem</label>
              <Textarea
                id="message"
                className="col-span-3"
                rows={5}
                placeholder="Digite sua sugestão de melhoria ou correção..."
                {...register("message", { required: "A mensagem é obrigatória" })}
              />
              {errors.message && <p className="col-span-4 text-red-500 text-sm">{errors.message.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Feedback"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}