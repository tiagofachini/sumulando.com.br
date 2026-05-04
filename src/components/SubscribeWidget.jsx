import React, { useState } from 'react';
import { Bell, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const SubscribeWidget = ({ sumulaId, sumulaTitle }) => {
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('email');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contact.trim()) {
      setErrorMsg(channel === 'email' ? 'Informe seu e-mail.' : 'Informe seu WhatsApp.');
      return;
    }
    if (!sumulaId) return;
    setErrorMsg('');
    setStatus('loading');

    const { error } = await supabase.rpc('upsert_subscriber_sumula', {
      p_name:      name.trim() || null,
      p_email:     channel === 'email'    ? contact.trim() : null,
      p_whatsapp:  channel === 'whatsapp' ? contact.trim() : null,
      p_sumula_id: sumulaId,
    });

    if (error) { setErrorMsg('Erro ao cadastrar. Tente novamente.'); setStatus('error'); return; }
    setStatus('success');
  };

  if (status === 'success') {
    return (
      <div className="my-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 flex items-center gap-2.5">
        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
        <p className="text-xs text-green-800">Pronto! Você receberá atualizações sobre esta súmula.</p>
      </div>
    );
  }

  const displayTitle = sumulaTitle
    ? (sumulaTitle.length > 60 ? sumulaTitle.slice(0, 57) + '…' : sumulaTitle)
    : 'esta súmula';

  return (
    <div className="my-4 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-xl shadow-sm px-4 py-3">
      {/* Header */}
      <div className="flex items-start gap-2 mb-2.5">
        <Bell className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs font-medium text-gray-700 leading-snug">
          Receba jurisprudências e atualizações sobre{' '}
          <span className="text-gray-900 font-semibold" title={sumulaTitle}>{displayTitle}</span>
        </p>
      </div>

      {/* Form — single compact row */}
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-1.5">
        {/* Name */}
        <input
          type="text"
          placeholder="Nome (opcional)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 w-32 flex-none"
        />

        {/* Channel toggle + contact — visually joined */}
        <div className="flex flex-1 min-w-[200px] h-8 rounded-lg border border-gray-200 overflow-hidden focus-within:border-blue-400 transition-colors">
          <div className="flex border-r border-gray-200 shrink-0">
            {['email', 'whatsapp'].map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { setChannel(c); setContact(''); setErrorMsg(''); }}
                className={`px-2 text-xs font-medium transition-colors ${
                  channel === c
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {c === 'email' ? 'E-mail' : 'WhatsApp'}
              </button>
            ))}
          </div>
          <input
            type={channel === 'email' ? 'email' : 'tel'}
            placeholder={channel === 'email' ? 'seu@email.com' : '(11) 99999-9999'}
            value={contact}
            onChange={e => { setContact(e.target.value); setErrorMsg(''); }}
            className="flex-1 px-2.5 text-xs bg-white focus:outline-none min-w-0"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={status === 'loading'}
          className="h-8 px-3 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 shrink-0 flex items-center gap-1 transition-all"
        >
          {status === 'loading'
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <><span>Cadastrar</span><ArrowRight className="w-3 h-3" /></>
          }
        </button>
      </form>

      {errorMsg && <p className="text-xs text-red-500 mt-1.5">{errorMsg}</p>}
    </div>
  );
};

export default SubscribeWidget;
