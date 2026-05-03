import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';

const SubscribeWidget = ({ sumulaTopics = [] }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [showTopics, setShowTopics] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (sumulaTopics && sumulaTopics.length > 0) {
      setAvailableTopics(sumulaTopics);
      setSelectedTopics(sumulaTopics.map(t => t.id));
    } else {
      supabase.from('topicos').select('id, name').order('name').then(({ data }) => {
        if (data) setAvailableTopics(data);
      });
    }
  }, [sumulaTopics]);

  const toggleTopic = (id) => {
    setSelectedTopics(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setErrorMsg('Informe seu nome.'); return; }
    if (!email.trim() && !whatsapp.trim()) { setErrorMsg('Informe e-mail ou WhatsApp.'); return; }
    setErrorMsg('');
    setStatus('loading');

    const { data: sub, error: subError } = await supabase
      .from('subscribers')
      .insert({ name: name.trim(), email: email.trim() || null, whatsapp: whatsapp.trim() || null })
      .select('id')
      .single();

    if (subError) {
      if (subError.code === '23505') {
        setErrorMsg('Este contato já está cadastrado. Obrigado pelo interesse!');
      } else {
        setErrorMsg('Erro ao cadastrar. Tente novamente.');
      }
      setStatus('error');
      return;
    }

    if (selectedTopics.length > 0 && sub?.id) {
      await supabase.from('subscriber_topicos').insert(
        selectedTopics.map(topico_id => ({ subscriber_id: sub.id, topico_id }))
      );
    }

    setStatus('success');
  };

  if (status === 'success') {
    return (
      <div className="my-6 rounded-2xl border border-green-200 bg-green-50 p-6 flex items-center gap-4">
        <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
        <div>
          <p className="font-semibold text-green-800">Cadastrado com sucesso!</p>
          <p className="text-sm text-green-700 mt-0.5">Você receberá novidades jurídicas em breve. É gratuito e sem spam.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-2xl border-l-4 border-blue-500 bg-white/80 backdrop-blur-xl shadow-md p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-full bg-blue-100 shrink-0 mt-0.5">
          <Bell className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-base leading-tight">
            Receba novidades jurídicas — é gratuito
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Seja notificado sobre novas súmulas e atualizações de jurisprudência.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            {['Gratuito', 'Sem spam', 'Cancele quando quiser'].map(b => (
              <span key={b} className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <Input
            placeholder="Seu nome *"
            value={name}
            onChange={e => setName(e.target.value)}
            className="h-10 text-sm"
          />
          <Input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="h-10 text-sm"
          />
          <Input
            placeholder="WhatsApp (com DDD)"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            className="h-10 text-sm"
          />
        </div>

        {availableTopics.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowTopics(v => !v)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
            >
              {showTopics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showTopics ? 'Ocultar tópicos de interesse' : 'Escolher tópicos de interesse'}
            </button>
            {showTopics && (
              <div className="mt-2 flex flex-wrap gap-2">
                {availableTopics.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTopic(t.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedTopics.includes(t.id)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={status === 'loading'}
            className="h-9 px-5 text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar gratuitamente'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SubscribeWidget;
