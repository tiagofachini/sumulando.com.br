import React, { useState } from 'react';
import { Bell, CheckCircle, Loader2, ArrowRight, Mail, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const applyPhoneMask = (digits) => {
  const d = digits.slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const detectChannel = (value) => {
  if (!value) return null;
  if (value.includes('@') || /^[a-zA-Z]/.test(value)) return 'email';
  if (/^[\d(]/.test(value)) return 'whatsapp';
  return null;
};

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidPhone = (v) => v.replace(/\D/g, '').length >= 10;

const SubscribeWidget = ({ sumulaId, sumulaTitle }) => {
  const [name, setName]       = useState('');
  const [contact, setContact] = useState('');
  const [channel, setChannel] = useState(null); // null | 'email' | 'whatsapp'
  const [status, setStatus]   = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleContactChange = (e) => {
    const raw = e.target.value;
    setErrorMsg('');

    if (raw === '') {
      setContact('');
      setChannel(null);
      return;
    }

    const detected = detectChannel(raw) ?? channel;
    setChannel(detected);

    if (detected === 'whatsapp') {
      const digits = raw.replace(/\D/g, '');
      setContact(applyPhoneMask(digits));
    } else {
      setContact(raw);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!contact.trim() || !channel) {
      setErrorMsg('Informe seu e-mail ou WhatsApp.');
      return;
    }
    if (channel === 'email' && !isValidEmail(contact)) {
      setErrorMsg('E-mail inválido.');
      return;
    }
    if (channel === 'whatsapp' && !isValidPhone(contact)) {
      setErrorMsg('WhatsApp incompleto. Informe DDD + número.');
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

    if (error) {
      console.error('upsert_subscriber_sumula error:', error);
      setErrorMsg('Erro ao cadastrar. Tente novamente.');
      setStatus('error');
      return;
    }
    setStatus('success');
  };

  if (status === 'success') {
    return (
      <div className="my-4 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2.5 flex items-center gap-2.5 border-l-4 border-l-green-500">
        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
        <p className="text-xs text-green-800">Pronto! Você receberá atualizações sobre esta súmula.</p>
      </div>
    );
  }

  const displayTitle = sumulaTitle
    ? (sumulaTitle.length > 60 ? sumulaTitle.slice(0, 57) + '…' : sumulaTitle)
    : 'esta súmula';

  const ChannelIcon = channel === 'email' ? Mail : channel === 'whatsapp' ? Phone : null;

  return (
    <div className="my-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/70 shadow-sm px-4 py-3 border-l-4 border-l-blue-500">
      <div className="flex items-start gap-2 mb-2.5">
        <Bell className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs font-semibold text-blue-900 leading-snug">
          Receba jurisprudências e atualizações sobre{' '}
          <span title={sumulaTitle}>{displayTitle}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-1.5">
        {/* Name */}
        <input
          type="text"
          placeholder="Nome (opcional)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400 w-32 flex-none"
        />

        {/* Auto-detect contact field */}
        <div className={`flex flex-1 min-w-[200px] h-8 rounded-lg border overflow-hidden transition-colors focus-within:border-blue-400 ${
          channel === 'email'    ? 'border-blue-300' :
          channel === 'whatsapp' ? 'border-green-300' :
          'border-gray-200'
        }`}>
          {ChannelIcon && (
            <div className={`flex items-center px-2 border-r shrink-0 ${
              channel === 'email'    ? 'border-blue-200 bg-blue-50'  :
              channel === 'whatsapp' ? 'border-green-200 bg-green-50' :
              'border-gray-200 bg-gray-50'
            }`}>
              <ChannelIcon className={`w-3 h-3 ${
                channel === 'email' ? 'text-blue-500' : 'text-green-600'
              }`} />
            </div>
          )}
          <input
            type={channel === 'whatsapp' ? 'tel' : 'text'}
            placeholder={
              channel === 'email'    ? 'seu@email.com'    :
              channel === 'whatsapp' ? '(11) 99999-9999'  :
              'E-mail ou WhatsApp'
            }
            value={contact}
            onChange={handleContactChange}
            className="flex-1 px-2.5 text-xs bg-white focus:outline-none min-w-0"
            inputMode={channel === 'whatsapp' ? 'numeric' : 'text'}
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
