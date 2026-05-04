import React, { useState } from 'react';
import { Bell, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';

const SubscribeWidget = ({ sumulaId, sumulaTitle }) => {
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('email'); // 'email' | 'whatsapp'
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contact.trim()) {
      setErrorMsg(channel === 'email' ? 'Informe seu e-mail.' : 'Informe seu WhatsApp.');
      return;
    }
    if (!sumulaId) {
      setErrorMsg('Súmula não identificada.');
      return;
    }
    setErrorMsg('');
    setStatus('loading');

    const { error } = await supabase.rpc('upsert_subscriber_sumula', {
      p_name:      name.trim() || null,
      p_email:     channel === 'email'    ? contact.trim() : null,
      p_whatsapp:  channel === 'whatsapp' ? contact.trim() : null,
      p_sumula_id: sumulaId,
    });

    if (error) {
      setErrorMsg('Erro ao cadastrar. Tente novamente.');
      setStatus('error');
      return;
    }

    setStatus('success');
  };

  if (status === 'success') {
    return (
      <div className="my-6 rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
        <p className="text-sm text-green-800">Cadastrado! Você receberá atualizações sobre esta súmula.</p>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-blue-600 shrink-0" />
        <h3 className="text-sm font-semibold text-gray-800">
          Receber atualizações sobre esta súmula
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          placeholder="Nome (opcional)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-9 text-sm"
        />

        <div className="flex gap-1 text-xs">
          {['email', 'whatsapp'].map(c => (
            <button
              key={c}
              type="button"
              onClick={() => { setChannel(c); setContact(''); setErrorMsg(''); }}
              className={`px-3 py-1 rounded-full border transition-colors font-medium ${
                channel === c
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400'
              }`}
            >
              {c === 'email' ? 'E-mail' : 'WhatsApp'}
            </button>
          ))}
        </div>

        <Input
          type={channel === 'email' ? 'email' : 'tel'}
          placeholder={channel === 'email' ? 'seu@email.com' : 'WhatsApp com DDD'}
          value={contact}
          onChange={e => { setContact(e.target.value); setErrorMsg(''); }}
          className="h-9 text-sm"
        />

        {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            disabled={status === 'loading'}
            size="sm"
            className="h-8 px-4 text-xs bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {status === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Receber atualizações'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SubscribeWidget;
