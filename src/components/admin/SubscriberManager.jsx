import React, { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, Download, Users, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const PAGE_SIZE = 50;

const SubscriberManager = () => {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => { setPage(0); }, [debouncedSearch]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_subscribers', {
        p_search_term: debouncedSearch,
        p_sumula_id: null,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      setSubscribers(data || []);
      setTotal(data?.[0]?.total_count || 0);
    } catch (err) {
      toast({ title: 'Erro ao carregar cadastrados', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id, label) => {
    const { error } = await supabase.rpc('delete_subscriber', { p_id: id });
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Cadastrado removido', description: `${label} foi removido da lista.` });
      loadData();
    }
  };

  const handleExportCsv = async () => {
    const { data, error } = await supabase.rpc('search_subscribers', {
      p_search_term: debouncedSearch,
      p_sumula_id: null,
      p_limit: 10000,
      p_offset: 0,
    });
    if (error) { toast({ title: 'Erro ao exportar', description: error.message, variant: 'destructive' }); return; }

    const rows = [['Nome', 'E-mail', 'WhatsApp', 'Súmulas acompanhadas', 'Cadastrado em']];
    (data || []).forEach(s => {
      rows.push([
        s.name || '',
        s.email || '',
        s.whatsapp || '',
        (s.sumulas || []).map(sm => sm.title).join('; '),
        new Date(s.created_at).toLocaleDateString('pt-BR'),
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadastrados-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV exportado', description: `${data?.length || 0} registros exportados.` });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Cadastrados</h1>
        <Button onClick={handleExportCsv} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <Card className="bg-indigo-50 border-indigo-200 w-fit">
        <CardContent className="p-4 text-center">
          <p className="text-3xl font-extrabold text-indigo-700">{total.toLocaleString('pt-BR')}</p>
          <p className="text-sm text-indigo-600 mt-1">Total de cadastrados</p>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-xl shadow-lg border-white/20 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Lista de Cadastrados
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, e-mail ou WhatsApp..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-center py-10 text-gray-500">Carregando cadastrados...</p>
          ) : subscribers.length === 0 ? (
            <p className="text-center py-10 text-gray-500">Nenhum cadastrado encontrado.</p>
          ) : (
            <div className="space-y-2">
              {subscribers.map(s => {
                const label = s.name || s.email || s.whatsapp || s.id;
                return (
                  <div key={s.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      {s.name && <p className="font-semibold text-gray-800 truncate">{s.name}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
                        {s.email && (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Mail className="w-3 h-3" /> {s.email}
                          </span>
                        )}
                        {s.whatsapp && (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Phone className="w-3 h-3" /> {s.whatsapp}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(s.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {s.sumulas?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.sumulas.map(sm => (
                            <Badge key={sm.id} variant="secondary" className="text-xs bg-blue-50 text-blue-700 max-w-[220px] truncate">
                              {sm.title}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="hover:bg-red-50 hover:text-red-600 hover:border-red-300 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover cadastrado?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso removerá <strong>{label}</strong> da lista permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(s.id, label)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriberManager;
