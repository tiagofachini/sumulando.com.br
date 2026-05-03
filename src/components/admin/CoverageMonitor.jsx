import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, ChevronDown, ChevronUp, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const CoverageBar = ({ pct }) => (
  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
    <div
      className={`h-2.5 rounded-full transition-all duration-500 ${
        pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-red-500'
      }`}
      style={{ width: `${Math.min(pct, 100)}%` }}
    />
  </div>
);

const TribunalCoverageCard = ({ row }) => {
  const [expanded, setExpanded] = useState(false);
  const missingCount = row.missing_numbers?.length || 0;
  const pct = parseFloat(row.coverage_pct) || 0;

  const buildUrl = (n) => {
    if (!row.sumula_url_template) return row.official_url || '#';
    return row.sumula_url_template.replace('{n}', n);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">{row.tribunal_name}</span>
            {row.official_url && (
              <a href={row.official_url} target="_blank" rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {row.sumulas_count} / {row.expected_count}
            </span>
            <Badge
              className={`text-xs font-bold ${
                pct >= 90 ? 'bg-green-100 text-green-800' :
                pct >= 70 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}
            >
              {pct}%
            </Badge>
          </div>
        </div>
        <CoverageBar pct={pct} />
        {missingCount > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {missingCount} {missingCount === 1 ? 'súmula faltando' : 'súmulas faltando'}
          </button>
        )}
        {missingCount === 0 && (
          <p className="mt-3 text-sm text-green-600 font-medium">Cobertura completa!</p>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-500 mb-2 font-medium">
                Números faltando — clique para abrir na fonte oficial:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {row.missing_numbers.map(n => (
                  <a
                    key={n}
                    href={buildUrl(n)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 rounded text-xs font-mono bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                    title={`Súmula ${n} — ${row.tribunal_name}`}
                  >
                    {n}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CoverageMonitor = () => {
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase.rpc('get_coverage_report');
      if (error) throw error;
      setData(rows || []);
      setLastUpdated(new Date());
    } catch (err) {
      toast({ title: 'Erro ao carregar cobertura', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalExpected = data.reduce((s, r) => s + (r.expected_count || 0), 0);
  const totalHave = data.reduce((s, r) => s + Number(r.sumulas_count || 0), 0);
  const totalMissing = data.reduce((s, r) => s + (r.missing_numbers?.length || 0), 0);
  const overallPct = totalExpected > 0 ? Math.round((totalHave / totalExpected) * 100 * 10) / 10 : 0;

  const unconfigured = data.length === 0 && !loading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Monitor de Cobertura</h1>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Atualizado em {lastUpdated.toLocaleTimeString('pt-BR')}
            </p>
          )}
        </div>
        <Button onClick={loadData} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {!unconfigured && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-extrabold text-blue-700">{overallPct}%</p>
              <p className="text-sm text-blue-600 mt-1">Cobertura geral</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-extrabold text-green-700">{totalHave.toLocaleString('pt-BR')}</p>
              <p className="text-sm text-green-600 mt-1">Súmulas cadastradas</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-extrabold text-red-700">{totalMissing.toLocaleString('pt-BR')}</p>
              <p className="text-sm text-red-600 mt-1">Súmulas faltando</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-white/80 backdrop-blur-xl shadow-lg border-white/20 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            Cobertura por Tribunal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 text-center py-8">Carregando dados de cobertura...</p>
          ) : unconfigured ? (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 border border-yellow-200">
              <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-800">Nenhum tribunal configurado para monitoramento</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Acesse <strong>Tribunais</strong> na barra lateral e preencha os campos
                  "Total esperado", "URL oficial" e "Template de URL" em cada tribunal.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map(row => (
                <TribunalCoverageCard key={row.tribunal_id} row={row} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CoverageMonitor;
