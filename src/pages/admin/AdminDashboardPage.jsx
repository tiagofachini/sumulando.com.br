import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Tag, Landmark, ArrowRight, HelpCircle, MessageSquare, CheckSquare, Inbox, Upload, File, X, AlertTriangle, SkipForward, RefreshCw, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { slugify } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminDashboardPage = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({ sumulas: 0, topicos: 0, tribunais: 0, faqs: 0 });
  const [feedbackStats, setFeedbackStats] = useState({ novo: 0, lido: 0, resolvido: 0 });
  const [topTopics, setTopTopics] = useState([]);
  const [topTribunais, setTopTribunais] = useState([]);
  const [topFaqSumulas, setTopFaqSumulas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importStep, setImportStep] = useState('upload'); // 'upload', 'confirm', 'result'
  const [importSummary, setImportSummary] = useState({
    inserts: [],
    updates: [],
    skips: [],
    errors: []
  });
  const [finalResult, setFinalResult] = useState({ success: 0, failed: 0, errorMessage: '' });
  const [importing, setImporting] = useState(false);
  
  // Cache for validation
  const [tribunaisMap, setTribunaisMap] = useState(new Map());
  const [existingSumulasMap, setExistingSumulasMap] = useState(new Map()); // Key: "title|tribunal_id", Value: { id, content, slug }
  const [existingSlugs, setExistingSlugs] = useState(new Set());
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
        const [
            { count: sumulasCount, error: sumulasError },
            { count: topicosCount },
            { count: tribunaisCount, data: tribunaisData, error: tribunaisError },
            { count: faqsCount },
            { data: feedbackData, error: feedbackError },
            { data: topicsData, error: topicsError },
            { data: topTribunaisData, error: topTribunaisError },
            { data: faqSumulasData, error: faqSumulasError },
        ] = await Promise.all([
            supabase.from('sumulas').select('*', { count: 'exact', head: true }),
            supabase.from('topicos').select('*', { count: 'exact', head: true }),
            supabase.from('tribunais').select('id, name', { count: 'exact' }),
            supabase.from('faqs').select('*', { count: 'exact', head: true }),
            supabase.rpc('get_feedback_stats').single(),
            supabase.rpc('get_top_topics'),
            supabase.rpc('get_top_tribunais'),
            supabase.rpc('get_top_sumulas_by_faq_count'),
        ]);

        if (sumulasError) throw sumulasError;
        if (tribunaisError) throw tribunaisError;
        if (feedbackError) throw feedbackError;
        if (topicsError) throw topicsError;
        if (topTribunaisError) throw topTribunaisError;
        if (faqSumulasError) throw faqSumulasError;

        setStats({
            sumulas: sumulasCount || 0,
            topicos: topicosCount || 0,
            tribunais: tribunaisCount || 0,
            faqs: faqsCount || 0,
        });

        setFeedbackStats(feedbackData || { novo: 0, lido: 0, resolvido: 0 });
        setTopTopics(topicsData || []);
        setTopTribunais(topTribunaisData || []);
        setTopFaqSumulas(faqSumulasData || []);

        // Prepare Maps for Import Validation — paginate to load all records
        setTribunaisMap(new Map(tribunaisData.map(t => [t.name.toLowerCase().trim(), t.id])));

        const sumulasMap = new Map();
        const slugsSet = new Set();
        const PAGE = 1000;
        let page = 0;
        let keepFetching = true;

        while (keepFetching) {
          const { data: chunk, error: chunkError } = await supabase
            .from('sumulas')
            .select('id, title, tribunal_id, slug, content')
            .range(page * PAGE, (page + 1) * PAGE - 1);

          if (chunkError) throw chunkError;

          (chunk || []).forEach(s => {
            sumulasMap.set(`${s.title.toLowerCase().trim()}|${s.tribunal_id}`, {
              id: s.id,
              content: s.content,
              slug: s.slug,
            });
            slugsSet.add(s.slug);
          });

          if (!chunk || chunk.length < PAGE) keepFetching = false;
          else page++;
        }

        setExistingSumulasMap(sumulasMap);
        setExistingSlugs(slugsSet);

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        toast({
            title: "Erro ao carregar dados",
            description: error.message,
            variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isImportModalOpen, toast]); 

  // --- CSV Import Logic ---

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      setImportFile(file);
    } else {
      toast({ title: "Arquivo Inválido", description: "Por favor, selecione um arquivo CSV.", variant: "destructive" });
      setImportFile(null);
    }
  };
  
  const resetImport = () => {
    setImportFile(null);
    setImportSummary({ inserts: [], updates: [], skips: [], errors: [] });
    setFinalResult({ success: 0, failed: 0, errorMessage: '' });
    setImportStep('upload');
    setImporting(false);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  // RFC 4180 compliant full-text CSV parser (handles quoted newlines and commas)
  const parseFullCSV = (text, separator = ',') => {
    const records = [];
    let currentRecord = [];
    let currentVal = '';
    let inQuote = false;
    let fieldQuoted = false;

    const pushField = () => {
      currentRecord.push({ value: currentVal, quoted: fieldQuoted });
      currentVal = '';
      fieldQuoted = false;
    };

    const pushRecord = () => {
      pushField();
      if (currentRecord.some(f => f.value.trim() !== '')) {
        records.push(currentRecord);
      }
      currentRecord = [];
    };

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuote) {
        if (c === '"') {
          if (i + 1 < text.length && text[i + 1] === '"') {
            currentVal += '"';
            i++;
          } else {
            inQuote = false;
          }
        } else {
          currentVal += c; // newlines inside quotes are part of the field
        }
      } else {
        if (c === '"' && currentVal === '') {
          inQuote = true;
          fieldQuoted = true;
        } else if (c === separator) {
          pushField();
        } else if (c === '\r') {
          if (i + 1 < text.length && text[i + 1] === '\n') i++;
          pushRecord();
        } else if (c === '\n') {
          pushRecord();
        } else {
          currentVal += c;
        }
      }
    }

    // Handle last record if file doesn't end with newline
    if (currentVal !== '' || currentRecord.length > 0) {
      pushRecord();
    }

    return records;
  };

  const detectSeparator = (firstLine) => {
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    return semicolons > commas ? ';' : ',';
  };

  const parseDate = (raw) => {
    if (!raw) return null;
    const trimmed = raw.trim();
    // DD/MM/YYYY → YYYY-MM-DD
    const brFormat = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brFormat) return `${brFormat[3]}-${brFormat[2]}-${brFormat[1]}`;
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    return null;
  };

  const normalizeContent = (str) => {
    return str ? str.replace(/\s+/g, ' ').trim() : '';
  };
  
  const processFile = () => {
    if (!importFile) return;
    setImporting(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Strip BOM (added by Excel when saving UTF-8 CSV)
        const raw = e.target.result.replace(/^﻿/, '');
        // Auto-detect separator: Excel BR uses ";" instead of ","
        const firstLine = raw.split(/\r?\n/)[0];
        const separator = detectSeparator(firstLine);
        const allRecords = parseFullCSV(raw, separator);

        if (allRecords.length < 2) {
            setImportSummary(prev => ({ ...prev, errors: [{ line: 1, message: "Arquivo vazio ou cabeçalho ausente." }] }));
            setImportStep('confirm');
            setImporting(false);
            return;
        }

        // Parse Header to find column indices
        const headerFields = allRecords[0];
        const headers = headerFields.map(f => f.value.toLowerCase().trim());

        const requiredHeaders = ['titulo', 'conteudo', 'tribunal'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
            setImportSummary(prev => ({ ...prev, errors: [{ line: 1, message: `Cabeçalho inválido. Faltando: ${missingHeaders.join(', ')}` }] }));
            setImportStep('confirm');
            setImporting(false);
            return;
        }

        const map = {};
        headers.forEach((h, i) => map[h] = i);

        const inserts = [];
        const updates = [];
        const skips = [];
        const errors = [];

        // Process Data Rows
        for (let i = 1; i < allRecords.length; i++) {
            const parsedLine = allRecords[i];
            const lineNum = i + 1;

            if (parsedLine.length < requiredHeaders.length) {
                errors.push({ line: lineNum, message: "Linha com colunas insuficientes." });
                continue;
            }

            const title = parsedLine[map['titulo']]?.value?.trim();
            const tribunalName = parsedLine[map['tribunal']]?.value?.trim();
            const publishDate = parseDate(parsedLine[map['publish_date']]?.value);
            const referenceLink = parsedLine[map['reference_link']]?.value?.trim();

            // Content: if unquoted and overflows into extra columns (unquoted commas),
            // join all fields from conteudo index onwards as a single content string.
            const conteudoIdx = map['conteudo'];
            const rawContentField = parsedLine[conteudoIdx];
            let content = '';
            if (rawContentField) {
                if (!rawContentField.quoted && parsedLine.length > conteudoIdx + 1) {
                    content = parsedLine.slice(conteudoIdx).map(f => f.value).join(',').trim();
                } else {
                    content = rawContentField.value.trim();
                }
            }

            // 1. Mandatory Fields
            if (!title || !content || !tribunalName) {
                errors.push({ line: lineNum, message: "Campos obrigatórios vazios (titulo, conteudo, tribunal)." });
                continue;
            }

            // 2. Tribunal Validation
            const tribunalId = tribunaisMap.get(tribunalName.toLowerCase());
            if (!tribunalId) {
                errors.push({ line: lineNum, message: `Tribunal inválido: "${tribunalName}"` });
                continue;
            }

            // 3. Duplicate/Update Logic
            const key = `${title.toLowerCase()}|${tribunalId}`;
            const existingRecord = existingSumulasMap.get(key);

            if (existingRecord) {
                const normNew = normalizeContent(content);
                const normOld = normalizeContent(existingRecord.content);

                if (normNew !== normOld) {
                    updates.push({
                        line: lineNum,
                        id: existingRecord.id,
                        title: title,
                        tribunal_id: tribunalId,
                        slug: existingRecord.slug,
                        content: content,
                        publish_date: publishDate || new Date().toISOString().split('T')[0],
                        reference_link: referenceLink
                    });
                } else {
                    skips.push({ line: lineNum, title, reason: "Conteúdo idêntico ao existente." });
                }
            } else {
                inserts.push({
                    line: lineNum,
                    title: title,
                    content: content,
                    tribunal_id: tribunalId,
                    tribunal_name: tribunalName,
                    publish_date: publishDate || new Date().toISOString().split('T')[0],
                    reference_link: referenceLink
                });
            }
        }

        setImportSummary({ inserts, updates, skips, errors });
        setImportStep('confirm');

      } catch (err) {
        console.error(err);
        setImportSummary(prev => ({ ...prev, errors: [{ line: 'Erro Geral', message: "Falha ao processar arquivo: " + err.message }] }));
        setImportStep('confirm');
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(importFile);
  };
  
  const handleImport = async () => {
    setImporting(true);
    let successCount = 0;
    let failCount = 0;
    let lastErrorMessage = '';

    const { inserts, updates } = importSummary;
    const BATCH_SIZE = 50;

    const chunkArray = (arr, size) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
      return chunks;
    };

    try {
        // Handle Inserts in batches
        if (inserts.length > 0) {
            const tempSlugs = new Set(existingSlugs);
            const recordsToInsert = inserts.map(item => {
                let baseSlug = slugify(`${item.title} ${item.tribunal_name}`);
                let finalSlug = baseSlug;
                let counter = 2;
                while (tempSlugs.has(finalSlug)) {
                    finalSlug = `${baseSlug}-${counter}`;
                    counter++;
                }
                tempSlugs.add(finalSlug);
                return {
                    title: item.title,
                    content: item.content,
                    tribunal_id: item.tribunal_id,
                    slug: finalSlug,
                    publish_date: item.publish_date || null,
                    reference_link: item.reference_link || null,
                };
            });

            for (const batch of chunkArray(recordsToInsert, BATCH_SIZE)) {
                const { error } = await supabase.from('sumulas').insert(batch);
                if (error) {
                    console.error("Insert batch error:", error);
                    failCount += batch.length;
                    lastErrorMessage = error.message;
                } else {
                    successCount += batch.length;
                }
            }
        }

        // Handle Updates individually (guarantees we know exactly which record fails)
        if (updates.length > 0) {
            for (const item of updates) {
                const { error } = await supabase
                    .from('sumulas')
                    .update({
                        content: item.content,
                        publish_date: item.publish_date || null,
                        reference_link: item.reference_link || null,
                    })
                    .eq('id', item.id);

                if (error) {
                    console.error(`Update error for "${item.title}":`, error);
                    failCount++;
                    lastErrorMessage = error.message;
                } else {
                    successCount++;
                }
            }
        }

        setFinalResult({ success: successCount, failed: failCount, errorMessage: lastErrorMessage });
        setImportStep('result');

    } catch (error) {
        console.error("Import failed", error);
        setFinalResult({ success: successCount, failed: failCount, errorMessage: error.message });
        setImportStep('result');
    } finally {
        setImporting(false);
    }
  };


  // --- Helper for Badge Sizes ---
  const getFontSize = (count, maxCount) => {
    if (maxCount === 0 || count === 0) return 'text-base';
    const minSize = 1;
    const maxSize = 1.75;
    const scale = (count / maxCount) * (maxSize - minSize) + minSize;
    return { fontSize: `${Math.max(scale, minSize)}rem` };
  };

  const maxTopicCount = topTopics.length > 0 ? Math.max(...topTopics.map(t => t.sumula_count)) : 0;
  const maxTribunalCount = topTribunais.length > 0 ? Math.max(...topTribunais.map(t => t.sumula_count)) : 0;
  const maxFaqCount = topFaqSumulas.length > 0 ? Math.max(...topFaqSumulas.map(s => s.faq_count)) : 0;
  
  const statCards = [
    { name: 'Súmulas Cadastradas', icon: FileText, to: '/admfachini/sumulas', count: stats.sumulas, color: 'from-blue-500 to-indigo-500' },
    { name: 'Tópicos Criados', icon: Tag, to: '/admfachini/topicos', count: stats.topicos, color: 'from-purple-500 to-pink-500' },
    { name: 'Tribunais Ativos', icon: Landmark, to: '/admfachini/tribunais', count: stats.tribunais, color: 'from-teal-500 to-cyan-500' },
    { name: 'FAQs Cadastradas', icon: HelpCircle, to: '/admfachini/faqs', count: stats.faqs, color: 'from-amber-500 to-orange-500' },
  ];
  
  const feedbackStatCards = [
    { name: 'Feedbacks Novos', icon: Inbox, to: '/admfachini/feedbacks?status=novo', count: feedbackStats.novo, color: 'from-red-500 to-rose-500' },
    { name: 'Feedbacks Lidos', icon: MessageSquare, to: '/admfachini/feedbacks?status=lido', count: feedbackStats.lido, color: 'from-yellow-500 to-amber-500' },
    { name: 'Feedbacks Resolvidos', icon: CheckSquare, to: '/admfachini/feedbacks?status=resolvido', count: feedbackStats.resolvido, color: 'from-green-500 to-emerald-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-600 mt-2">Bem-vindo! Aqui está um resumo do conteúdo do seu site.</p>
        </div>
        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="bg-white" onClick={resetImport}>
                    <Upload className="mr-2 h-4 w-4" /> Importar Súmulas
                </Button>
            </DialogTrigger>
            <DialogContent className="w-full h-full max-w-full md:max-w-4xl md:h-[85vh] md:max-h-[85vh] p-0 flex flex-col bg-white overflow-hidden rounded-none md:rounded-lg">
                <DialogHeader className="p-6 pb-2 flex-shrink-0">
                    <DialogTitle className="text-2xl">Importar Súmulas por CSV</DialogTitle>
                    <DialogDescription>
                        Gerencie a importação em massa de súmulas, com verificação de duplicatas e atualizações inteligentes.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {importStep === 'upload' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                                <h4 className="font-bold mb-2 flex items-center"><FileText className="w-4 h-4 mr-2"/> Formato Obrigatório</h4>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                    <li>Colunas: <strong>titulo, tribunal, reference_link, publish_date, conteudo</strong></li>
                                    <li>Conteúdo com vírgulas ou quebras de linha deve estar entre aspas duplas ("...").</li>
                                    <li>Use aspas duplas duplas ("") para escapar aspas dentro do conteúdo.</li>
                                    <li>Súmulas existentes (mesmo título e tribunal) serão atualizadas se o conteúdo for diferente.</li>
                                </ul>
                            </div>
                            
                            <label
                                htmlFor="csv-upload"
                                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-12 h-12 mb-3 text-gray-400"/>
                                    <p className="mb-2 text-sm text-gray-600 font-medium">Clique para selecionar ou arraste o arquivo</p>
                                    <p className="text-xs text-gray-400">Apenas arquivos .csv</p>
                                </div>
                                <input id="csv-upload" ref={fileInputRef} type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                            </label>

                            {importFile && (
                                <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 rounded-full">
                                            <File className="w-5 h-5 text-green-700"/>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{importFile.name}</p>
                                            <p className="text-xs text-gray-500">Pronto para validar</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => { setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                                        <X className="w-4 h-4 text-gray-500 hover:text-red-500"/>
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {importStep === 'confirm' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card className="bg-green-50 border-green-200">
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                        <span className="text-2xl font-bold text-green-700">{importSummary.inserts.length}</span>
                                        <span className="text-xs font-medium text-green-800 uppercase tracking-wide">Novos</span>
                                    </CardContent>
                                </Card>
                                <Card className="bg-blue-50 border-blue-200">
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                        <span className="text-2xl font-bold text-blue-700">{importSummary.updates.length}</span>
                                        <span className="text-xs font-medium text-blue-800 uppercase tracking-wide">Atualizações</span>
                                    </CardContent>
                                </Card>
                                <Card className="bg-orange-50 border-orange-200">
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                        <span className="text-2xl font-bold text-orange-700">{importSummary.skips.length}</span>
                                        <span className="text-xs font-medium text-orange-800 uppercase tracking-wide">Pulados</span>
                                    </CardContent>
                                </Card>
                                <Card className="bg-red-50 border-red-200">
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                        <span className="text-2xl font-bold text-red-700">{importSummary.errors.length}</span>
                                        <span className="text-xs font-medium text-red-800 uppercase tracking-wide">Erros</span>
                                    </CardContent>
                                </Card>
                            </div>

                            <Tabs defaultValue="valid" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="valid">Válidos ({importSummary.inserts.length + importSummary.updates.length})</TabsTrigger>
                                    <TabsTrigger value="issues" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-900">
                                        Problemas ({importSummary.errors.length + importSummary.skips.length})
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="valid" className="mt-4">
                                    <ScrollArea className="h-64 md:h-80 w-full rounded-md border bg-gray-50 p-4">
                                        {importSummary.inserts.length === 0 && importSummary.updates.length === 0 ? (
                                            <p className="text-center text-gray-500 py-8">Nenhum registro válido para importar.</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {importSummary.inserts.length > 0 && (
                                                    <div>
                                                        <h5 className="font-semibold text-green-700 mb-2 sticky top-0 bg-gray-50">Novas Inserções</h5>
                                                        <ul className="space-y-2 text-sm">
                                                            {importSummary.inserts.slice(0, 50).map((item, idx) => (
                                                                <li key={idx} className="flex justify-between items-center border-b pb-1 last:border-0">
                                                                    <span className="truncate flex-1 font-medium">{item.title}</span>
                                                                    <span className="text-xs text-gray-500 ml-2">{item.tribunal_name}</span>
                                                                </li>
                                                            ))}
                                                            {importSummary.inserts.length > 50 && <li className="text-center text-xs text-gray-500 pt-2">...e mais {importSummary.inserts.length - 50}</li>}
                                                        </ul>
                                                    </div>
                                                )}
                                                {importSummary.updates.length > 0 && (
                                                    <div className="mt-4">
                                                        <h5 className="font-semibold text-blue-700 mb-2 sticky top-0 bg-gray-50">Atualizações</h5>
                                                        <ul className="space-y-2 text-sm">
                                                            {importSummary.updates.slice(0, 50).map((item, idx) => (
                                                                <li key={idx} className="flex justify-between items-center border-b pb-1 last:border-0">
                                                                    <span className="truncate flex-1 font-medium">{item.title}</span>
                                                                    <Badge variant="outline" className="ml-2 text-[10px] text-blue-600 border-blue-200">Update</Badge>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>
                                <TabsContent value="issues" className="mt-4">
                                    <ScrollArea className="h-64 md:h-80 w-full rounded-md border bg-red-50/50 p-4">
                                        {importSummary.errors.length === 0 && importSummary.skips.length === 0 ? (
                                            <p className="text-center text-gray-500 py-8">Nenhum problema encontrado.</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {importSummary.errors.length > 0 && (
                                                    <div>
                                                        <h5 className="font-semibold text-red-700 mb-2 sticky top-0 bg-red-50/50 flex items-center"><AlertTriangle className="w-4 h-4 mr-1"/> Erros (Não serão importados)</h5>
                                                        <ul className="space-y-2 text-sm">
                                                            {importSummary.errors.map((err, idx) => (
                                                                <li key={idx} className="border-b border-red-100 pb-2 last:border-0">
                                                                    <div className="font-medium text-red-800">Linha {err.line}</div>
                                                                    <div className="text-red-600">{err.message}</div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {importSummary.skips.length > 0 && (
                                                    <div className="mt-4">
                                                        <h5 className="font-semibold text-orange-700 mb-2 sticky top-0 bg-red-50/50 flex items-center"><SkipForward className="w-4 h-4 mr-1"/> Ignorados (Duplicados sem melhoria)</h5>
                                                        <ul className="space-y-2 text-sm">
                                                            {importSummary.skips.slice(0, 50).map((skip, idx) => (
                                                                <li key={idx} className="flex justify-between items-start border-b border-orange-100 pb-1 last:border-0">
                                                                    <div>
                                                                        <span className="font-medium text-gray-700 block">{skip.title}</span>
                                                                        <span className="text-xs text-orange-600">{skip.reason}</span>
                                                                    </div>
                                                                    <span className="text-xs text-gray-400">L:{skip.line}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                    
                    {importStep === 'result' && (
                        <div className="flex flex-col items-center justify-center h-full space-y-6 py-8">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${finalResult.failed === 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                                {finalResult.failed === 0
                                    ? <CheckCircle className="w-10 h-10 text-green-600" />
                                    : <AlertTriangle className="w-10 h-10 text-yellow-600" />
                                }
                            </div>
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-gray-800">Importação Finalizada!</h3>
                                <p className="text-gray-600 mt-2">O processo foi concluído com o seguinte resultado:</p>
                            </div>
                            <div className="flex gap-8 text-center">
                                <div>
                                    <p className="text-3xl font-bold text-green-600">{finalResult.success}</p>
                                    <p className="text-sm text-gray-500 uppercase font-medium">Sucessos</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-red-600">{finalResult.failed}</p>
                                    <p className="text-sm text-gray-500 uppercase font-medium">Falhas</p>
                                </div>
                            </div>
                            {finalResult.errorMessage && (
                                <div className="w-full max-w-lg p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 break-words">
                                    <p className="font-bold mb-1">Último erro registrado:</p>
                                    <p className="font-mono">{finalResult.errorMessage}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-4 border-t bg-gray-50 flex-shrink-0 flex-col sm:flex-row gap-3">
                    {importStep === 'upload' && (
                        <Button 
                            className="w-full sm:w-auto ml-auto" 
                            onClick={processFile} 
                            disabled={!importFile || importing}
                        >
                            {importing ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Processando...
                                </>
                            ) : (
                                'Analisar Arquivo'
                            )}
                        </Button>
                    )}
                    {importStep === 'confirm' && (
                        <>
                            <Button variant="outline" className="w-full sm:w-auto" onClick={resetImport} disabled={importing}>
                                Cancelar
                            </Button>
                            <Button 
                                className="w-full sm:w-auto" 
                                onClick={handleImport} 
                                disabled={importing || (importSummary.inserts.length === 0 && importSummary.updates.length === 0)}
                            >
                                {importing ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                                    </>
                                ) : (
                                    `Confirmar (${importSummary.inserts.length + importSummary.updates.length})`
                                )}
                            </Button>
                        </>
                    )}
                    {importStep === 'result' && (
                        <Button className="w-full sm:w-auto ml-auto" onClick={() => setIsImportModalOpen(false)}>
                            Fechar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
      
      {/* Dashboard Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-white/80 backdrop-blur-xl shadow-lg border-white/20 hover:shadow-xl transition-shadow duration-300 rounded-2xl overflow-hidden">
              <CardHeader className={`bg-gradient-to-br ${stat.color} p-6 flex flex-row items-center justify-between`}>
                <stat.icon className="w-8 h-8 text-white/80" />
                <CardTitle className="text-white text-4xl font-extrabold">{loading ? '...' : stat.count}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">{stat.name}</h3>
                <Link to={stat.to} className="flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                  Gerenciar
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {feedbackStatCards.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.4 }}
          >
            <Card className="bg-white/80 backdrop-blur-xl shadow-lg border-white/20 hover:shadow-xl transition-shadow duration-300 rounded-2xl overflow-hidden">
              <CardHeader className={`bg-gradient-to-br ${stat.color} p-6 flex flex-row items-center justify-between`}>
                <stat.icon className="w-8 h-8 text-white/80" />
                <CardTitle className="text-white text-4xl font-extrabold">{loading ? '...' : stat.count}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">{stat.name}</h3>
                <Link to={stat.to} className="flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                  Ver Feedbacks
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-white/80 backdrop-blur-xl shadow-lg border-white/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center"><Tag className="w-6 h-6 mr-3 text-purple-600"/> Tópicos Populares</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <p>Carregando...</p> : 
                  topTopics.length > 0 ? (
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                        {topTopics.map(topic => (
                            <Link to={`/busca?topico=${topic.id}`} key={topic.id} target="_blank">
                                <Badge className="transform hover:scale-110 transition-transform duration-200" style={getFontSize(topic.sumula_count, maxTopicCount)} variant="secondary">
                                    {topic.name} ({topic.sumula_count})
                                </Badge>
                            </Link>
                        ))}
                    </div>
                  ) : <p className="text-gray-500">Nenhum tópico encontrado.</p>
                }
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-white/80 backdrop-blur-xl shadow-lg border-white/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center"><Landmark className="w-6 h-6 mr-3 text-teal-600"/> Tribunais com mais Súmulas</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <p>Carregando...</p> :
                  topTribunais.length > 0 ? (
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                        {topTribunais.map(tribunal => (
                            <Link to={`/busca?tribunal=${tribunal.id}`} key={tribunal.id} target="_blank">
                                <Badge className="transform hover:scale-110 transition-transform duration-200" style={getFontSize(tribunal.sumula_count, maxTribunalCount)} variant="secondary">
                                    {tribunal.name} ({tribunal.sumula_count})
                                </Badge>
                            </Link>
                        ))}
                    </div>
                  ) : <p className="text-gray-500">Nenhum tribunal encontrado.</p>
                }
              </CardContent>
            </Card>
          </motion.div>
      </div>

       <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="bg-white/80 backdrop-blur-xl shadow-lg border-white/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center"><HelpCircle className="w-6 h-6 mr-3 text-orange-600"/> Súmulas com mais FAQs</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <p>Carregando...</p> : 
                  topFaqSumulas.length > 0 ? (
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                        {topFaqSumulas.map(sumula => (
                            <Link to={`/sumula/${sumula.slug}`} key={sumula.id} target="_blank">
                                <Badge className="transform hover:scale-110 transition-transform duration-200" style={getFontSize(sumula.faq_count, maxFaqCount)} variant="secondary">
                                    {sumula.title} ({sumula.faq_count})
                                </Badge>
                            </Link>
                        ))}
                    </div>
                  ) : <p className="text-gray-500">Nenhuma súmula com FAQ encontrada.</p>
                }
              </CardContent>
            </Card>
       </motion.div>
    </div>
  );
};

export default AdminDashboardPage;