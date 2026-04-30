import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit, ChevronLeft, ChevronRight, Search, Download, Layers, Check, ChevronsUpDown, Tag, ArrowUpDown, Sparkles, HelpCircle, CheckCircle2, XCircle, Loader2, Brain, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { slugify } from '@/lib/utils';
import { Link } from 'react-router-dom';
import SumulaForm from './SumulaForm';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectCombobox } from '@/components/MultiSelectCombobox';
import { supabase } from '@/lib/supabaseClient';
import { supabaseUrl, supabaseAnonKey } from '@/lib/customSupabaseClient';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


const SUMULAS_PER_PAGE = 10;

const SumulaManager = () => {
  const { toast } = useToast();
  const [sumulas, setSumulas] = useState([]);
  const [tribunais, setTribunais] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [tribunalFilter, setTribunalFilter] = useState('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [faqFilter, setFaqFilter] = useState('all');
  const [sortOption, setSortOption] = useState('createdAt_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedSumulas, setSelectedSumulas] = useState([]);
  const [bulkTopics, setBulkTopics] = useState([]);
  const [topicFilterOpen, setTopicFilterOpen] = useState(false);
  const [genModalStage, setGenModalStage] = useState(null); // null | 'confirm' | 'processing' | 'done'
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0, results: [] });
  const [topicModalStage, setTopicModalStage] = useState(null); // null | 'confirm' | 'processing' | 'review' | 'applying' | 'done'
  const [topicProgress, setTopicProgress] = useState({ current: 0, total: 0 });
  const [topicSuggestions, setTopicSuggestions] = useState([]); // [{sumuId, sumuTitle, error, suggestions:[{...accepted}]}]

  const [formData, setFormData] = useState({
    id: '', slug: '', title: '', content: '',
    publishDate: new Date().toISOString().split('T')[0],
    referenceLink: '', tribunal: '', categories: [], youtubeUrl: ''
  });

  const loadData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // Supabase has a default limit of 1000 records. We fetch in chunks to get all records.
      let allSumulas = [];
      let lastItem = null;
      let hasMore = true;
      let offset = 0;
      const CHUNK_SIZE = 1000;
      
      while(hasMore) {
          const { data: sumulasData, error: sumulasError } = await supabase
            .from('sumulas')
            .select(`
              *,
              tribunais(name),
              sumula_topicos(topicos(id, name)),
              faqs(id)
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + CHUNK_SIZE - 1);
            
          if (sumulasError) throw sumulasError;

          if (sumulasData && sumulasData.length > 0) {
            allSumulas.push(...sumulasData);
            offset += CHUNK_SIZE;
          } else {
            hasMore = false;
          }
      }

      const formattedSumulas = allSumulas.map(s => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        content: s.content,
        publishDate: s.publish_date,
        referenceLink: s.reference_link,
        tribunal: s.tribunal_id,
        tribunalName: s.tribunais.name,
        categories: s.sumula_topicos.map(st => st.topicos.id),
        categoryObjects: s.sumula_topicos.map(st => st.topicos).filter(Boolean),
        createdAt: s.created_at,
        youtubeUrl: s.youtube_url,
        faqCount: s.faqs?.length || 0,
      }));
      setSumulas(formattedSumulas);

      const { data: tribunaisData, error: tribunaisError } = await supabase.from('tribunais').select('*');
      if (tribunaisError) throw tribunaisError;
      setTribunais(tribunaisData);

      const { data: categoriesData, error: categoriesError } = await supabase.from('topicos').select('*').order('name');
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData);

    } catch (error) {
      console.error("Failed to load data from Supabase", error);
      toast({
        title: "Erro ao carregar dados",
        description: `Não foi possível carregar os dados: ${error.message}`,
        variant: "destructive",
      });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownloadXmlSitemap = () => {
    const today = new Date().toISOString().split('T')[0];
    const baseUrl = window.location.origin;

    const staticUrls = [
      { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${baseUrl}/busca`, priority: '0.8', changefreq: 'weekly' }
    ];

    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xmlContent += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    staticUrls.forEach(url => {
        xmlContent += `  <url>\n`;
        xmlContent += `    <loc>${url.loc}</loc>\n`;
        xmlContent += `    <lastmod>${today}</lastmod>\n`;
        xmlContent += `    <changefreq>${url.changefreq}</changefreq>\n`;
        xmlContent += `    <priority>${url.priority}</priority>\n`;
        xmlContent += `  </url>\n`;
    });

    sumulas.forEach(sumula => {
      const url = `${baseUrl}/sumula/${sumula.slug}`;
      const lastMod = sumula.publishDate ? new Date(sumula.publishDate).toISOString().split('T')[0] : today;
      xmlContent += `  <url>\n`;
      xmlContent += `    <loc>${url}</loc>\n`;
      xmlContent += `    <lastmod>${lastMod}</lastmod>\n`;
      xmlContent += `    <changefreq>monthly</changefreq>\n`;
      xmlContent += `    <priority>0.9</priority>\n`;
      xmlContent += `  </url>\n`;
    });

    xmlContent += `</urlset>`;

    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "sitemap-sumulas.xml");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    toast({
      title: "Download Iniciado!",
      description: "O seu sitemap em XML está sendo baixado.",
    });
  };

  const resetForm = () => {
    setFormData({
      id: '', slug: '', title: '', content: '',
      publishDate: new Date().toISOString().split('T')[0],
      referenceLink: '', tribunal: '', categories: [], youtubeUrl: ''
    });
    setIsFormVisible(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim() || !formData.tribunal) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    
    if (editingId && !formData.slug.trim()) {
        toast({ title: "Erro", description: "O campo Link (Slug) é obrigatório na edição.", variant: "destructive" });
        return;
    }

    const tribunal = tribunais.find(t => t.id === formData.tribunal);
    if (!tribunal) {
        toast({ title: "Erro", description: "Tribunal inválido.", variant: "destructive" });
        return;
    }

    const newTitle = formData.title.trim();
    const newSlug = editingId ? slugify(formData.slug.trim()) : slugify(`${newTitle} ${tribunal.name}`);

    // Check for duplicate title
    let titleQuery = supabase.from('sumulas').select('id', { count: 'exact' }).eq('title', newTitle).eq('tribunal_id', formData.tribunal);
    if (editingId) titleQuery = titleQuery.not('id', 'eq', editingId);
    
    const { count: existingTitleCount, error: titleCheckError } = await titleQuery;
    if (titleCheckError) {
      toast({ title: "Erro de Validação", description: titleCheckError.message, variant: "destructive" });
      return;
    }
    if (existingTitleCount > 0) {
      toast({ title: "Duplicidade de Título", description: `Uma súmula com este título já existe para o tribunal ${tribunal.name}.`, variant: "destructive" });
      return;
    }

    // Check for duplicate slug
    let slugQuery = supabase.from('sumulas').select('id', { count: 'exact' }).eq('slug', newSlug);
    if (editingId) slugQuery = slugQuery.not('id', 'eq', editingId);

    const { count: existingSlugCount, error: slugCheckError } = await slugQuery;
    if (slugCheckError) {
      toast({ title: "Erro de Validação", description: slugCheckError.message, variant: "destructive" });
      return;
    }
    if (existingSlugCount > 0) {
      toast({ title: "Duplicidade de Link", description: `Este Link (Slug) já está em uso por outra súmula.`, variant: "destructive" });
      return;
    }


    const sumulaData = {
      title: newTitle,
      slug: newSlug,
      content: formData.content,
      publish_date: formData.publishDate,
      reference_link: formData.referenceLink,
      tribunal_id: formData.tribunal,
      youtube_url: formData.youtubeUrl || null
    };

    try {
      let sumulaId = editingId;
      if (editingId) {
        const { error } = await supabase.from('sumulas').update(sumulaData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('sumulas').insert(sumulaData).select('id').single();
        if (error) throw error;
        sumulaId = data.id;
      }

      const { error: deleteRelationsError } = await supabase.from('sumula_topicos').delete().eq('sumula_id', sumulaId);
      if (deleteRelationsError) throw deleteRelationsError;

      if (formData.categories.length > 0) {
        const relations = formData.categories.map(topicId => ({
          sumula_id: sumulaId,
          topico_id: topicId,
        }));
        const { error: insertRelationsError } = await supabase.from('sumula_topicos').insert(relations);
        if (insertRelationsError) throw insertRelationsError;
      }

      toast({
        title: "Sucesso!",
        description: editingId ? "Súmula atualizada com sucesso" : "Súmula cadastrada com sucesso",
      });

      resetForm();
      loadData();
      window.scrollTo(0, 0);

    } catch(error) {
        console.error("Error saving sumula:", error);
        toast({ title: "Erro ao Salvar", description: `Houve um problema ao salvar a súmula: ${error.message}`, variant: "destructive" });
    }
  };

  const handleDelete = async (sumula) => {
    try {
        const { error } = await supabase.from('sumulas').delete().eq('id', sumula.id);
        if (error) throw error;
        
        loadData();
        toast({ title: "Súmula removida", description: "A súmula foi removida com sucesso" });
    } catch(error) {
        console.error("Error deleting sumula:", error);
        toast({ title: "Erro ao Remover", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (sumula) => {
    setFormData({
      ...sumula, title: sumula.title, categories: sumula.categories || [],
      publishDate: sumula.publishDate ? new Date(sumula.publishDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      youtubeUrl: sumula.youtubeUrl || ''
    });
    setEditingId(sumula.id);
    setIsFormVisible(true);
    window.scrollTo(0, 0);
  };

  const handleAddNew = () => {
    setFormData({
        id: '', 
        slug: '', 
        title: 'Súmula ', 
        content: '',
        publishDate: new Date().toISOString().split('T')[0],
        referenceLink: '', 
        tribunal: '', 
        categories: [],
        youtubeUrl: ''
    });
    setEditingId(null);
    setIsFormVisible(true);
    window.scrollTo(0, 0);
  }
  
  const filteredAndSortedSumulas = useMemo(() => {
    const termLower = searchTerm.toLowerCase();

    const getTitleRelevance = (sumula) => {
      if (!termLower) return 0;
      const title = sumula.title.toLowerCase();
      try {
        const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`\\b${escaped}\\b`).test(title)) return 80;
      } catch (_) { /* ignore invalid regex */ }
      if (title.includes(termLower)) return 70;
      return 30; // content match
    };

    const filtered = sumulas.filter(sumula => {
      const searchTermMatch = termLower === '' ||
        sumula.title.toLowerCase().includes(termLower) ||
        sumula.content.toLowerCase().includes(termLower);

      const tribunalMatch = tribunalFilter === 'all' || sumula.tribunal === tribunalFilter;

      let topicMatch = true;
      if (topicFilter === 'no-topics') {
        topicMatch = !sumula.categories || sumula.categories.length === 0;
      } else if (topicFilter !== 'all') {
        topicMatch = sumula.categories && sumula.categories.includes(topicFilter);
      }

      let faqMatch = true;
      if (faqFilter === 'no-faqs') {
        faqMatch = sumula.faqCount === 0;
      } else if (faqFilter === 'with-faqs') {
        faqMatch = sumula.faqCount > 0;
      }

      return searchTermMatch && tribunalMatch && topicMatch && faqMatch;
    });

    const [key, direction] = sortOption.split('_');

    return [...filtered].sort((a, b) => {
      // When searching, relevance is primary sort key
      if (termLower) {
        const scoreDiff = getTitleRelevance(b) - getTitleRelevance(a);
        if (scoreDiff !== 0) return scoreDiff;
      }

      // User-chosen sort as secondary (or primary when not searching)
      let valA = a[key];
      let valB = b[key];
      if (key === 'title') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  }, [sumulas, searchTerm, tribunalFilter, topicFilter, faqFilter, sortOption]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedSumulas([]);
  }, [searchTerm, tribunalFilter, topicFilter, faqFilter, sortOption]);

  const totalPages = Math.ceil(filteredAndSortedSumulas.length / SUMULAS_PER_PAGE);
  const paginatedSumulas = filteredAndSortedSumulas.slice((currentPage - 1) * SUMULAS_PER_PAGE, currentPage * SUMULAS_PER_PAGE);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSelectSumula = (id) => {
    setSelectedSumulas(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedSumulas(paginatedSumulas.map(s => s.id));
    } else {
      setSelectedSumulas([]);
    }
  };

  const handleBulkAddTopics = async () => {
    if (selectedSumulas.length === 0 || bulkTopics.length === 0) {
      toast({ title: "Ação em Massa", description: "Selecione súmulas e tópicos para adicionar.", variant: "destructive" });
      return;
    }

    try {
      const relations = [];
      for (const sumulaId of selectedSumulas) {
        for (const topicId of bulkTopics) {
          relations.push({ sumula_id: sumulaId, topico_id: topicId });
        }
      }

      const { error } = await supabase.from('sumula_topicos').upsert(relations, { onConflict: 'sumula_id, topico_id', ignoreDuplicates: true });
      if (error) throw error;

      toast({ title: "Sucesso!", description: `Tópicos adicionados a ${selectedSumulas.length} súmulas.` });
      setSelectedSumulas([]);
      setBulkTopics([]);
      loadData();
    } catch (error) {
      toast({ title: "Erro na Ação em Massa", description: error.message, variant: "destructive" });
    }
  };

  const topicOptions = useMemo(() => categories.map(cat => ({
    value: cat.id,
    label: cat.name
  })), [categories]);

  const selectedBulkTopics = useMemo(() => topicOptions.filter(option => bulkTopics.includes(option.value)), [topicOptions, bulkTopics]);

  const handleBulkTopicChange = (selectedOptions) => {
    const selectedIds = selectedOptions.map(opt => opt.value);
    setBulkTopics(selectedIds);
  };

  const handleGenerateFaqs = async () => {
    const sumulasToProcess = sumulas.filter(s => selectedSumulas.includes(s.id));
    setGenProgress({ current: 0, total: sumulasToProcess.length, results: [] });
    setGenModalStage('processing');

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-faqs`;

    for (let i = 0; i < sumulasToProcess.length; i++) {
      const sumula = sumulasToProcess[i];
      try {
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            sumula_id: sumula.id,
            title: sumula.title,
            content: sumula.content,
          }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Falha desconhecida');
        setGenProgress(prev => ({
          ...prev,
          current: i + 1,
          results: [...prev.results, { title: sumula.title, status: 'ok', count: data.count }],
        }));
      } catch (error) {
        setGenProgress(prev => ({
          ...prev,
          current: i + 1,
          results: [...prev.results, { title: sumula.title, status: 'error', error: error.message }],
        }));
      }
    }

    setGenModalStage('done');
    loadData();
    setSelectedSumulas([]);
  };

  const handleSuggestTopics = async () => {
    const sumulasToProcess = sumulas.filter(s => selectedSumulas.includes(s.id));
    setTopicProgress({ current: 0, total: sumulasToProcess.length });
    setTopicSuggestions([]);
    setTopicModalStage('processing');

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/suggest-topics`;
    const allTopics = categories.map(c => ({ id: c.id, name: c.name }));

    for (let i = 0; i < sumulasToProcess.length; i++) {
      const sumula = sumulasToProcess[i];
      try {
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            sumula_id: sumula.id,
            title: sumula.title,
            content: sumula.content,
            existing_topics: allTopics,
          }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Falha desconhecida');

        const currentIds = new Set(sumula.categories);
        const filteredSuggestions = data.suggestions
          .filter(s => s.is_new || !currentIds.has(s.topic_id))
          .map(s => ({ ...s, accepted: true }));

        setTopicSuggestions(prev => [...prev, {
          sumuId: sumula.id,
          sumuTitle: sumula.title,
          error: null,
          suggestions: filteredSuggestions,
        }]);
      } catch (error) {
        setTopicSuggestions(prev => [...prev, {
          sumuId: sumula.id,
          sumuTitle: sumula.title,
          error: error.message,
          suggestions: [],
        }]);
      }
      setTopicProgress(prev => ({ ...prev, current: i + 1 }));
    }

    setTopicModalStage('review');
  };

  const toggleTopicSuggestion = (sumuIdx, sugIdx) => {
    setTopicSuggestions(prev => prev.map((s, i) => {
      if (i !== sumuIdx) return s;
      return {
        ...s,
        suggestions: s.suggestions.map((sg, j) =>
          j !== sugIdx ? sg : { ...sg, accepted: !sg.accepted }
        ),
      };
    }));
  };

  const handleApplyTopicSuggestions = async () => {
    setTopicModalStage('applying');
    try {
      const relations = [];
      const newTopicsToCreate = [];

      for (const sumuData of topicSuggestions) {
        for (const sug of sumuData.suggestions) {
          if (!sug.accepted) continue;
          if (sug.is_new) {
            newTopicsToCreate.push({ sumuId: sumuData.sumuId, name: sug.topic_name });
          } else {
            relations.push({ sumula_id: sumuData.sumuId, topico_id: sug.topic_id });
          }
        }
      }

      for (const newTopic of newTopicsToCreate) {
        const { data: topicData, error: topicError } = await supabase
          .from('topicos')
          .insert({ name: newTopic.name })
          .select('id')
          .single();
        if (topicError) throw topicError;
        relations.push({ sumula_id: newTopic.sumuId, topico_id: topicData.id });
      }

      if (relations.length > 0) {
        const { error } = await supabase
          .from('sumula_topicos')
          .upsert(relations, { onConflict: 'sumula_id, topico_id', ignoreDuplicates: true });
        if (error) throw error;
      }

      toast({ title: 'Tópicos aplicados!', description: `${relations.length} associações criadas com sucesso.` });
      setTopicModalStage('done');
      loadData();
      setSelectedSumulas([]);
    } catch (error) {
      toast({ title: 'Erro ao aplicar', description: error.message, variant: 'destructive' });
      setTopicModalStage('review');
    }
  };

  const getTopicFilterLabel = () => {
    if (topicFilter === 'all') return 'Todos os Tópicos';
    if (topicFilter === 'no-topics') return 'Sem Tópicos';
    const topic = categories.find(c => c.id === topicFilter);
    return topic ? topic.name : 'Filtrar por tópico';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800">
          Gerenciar Súmulas
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleDownloadXmlSitemap}
              variant="outline"
              className="bg-green-100 border-green-200 text-green-700 hover:bg-green-200 hover:text-green-800"
            >
              <Download className="w-5 h-5 mr-2" />
              Sitemap XML
            </Button>
            <Button
            onClick={handleAddNew}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
            <Plus className="w-5 h-5 mr-2" />
            Nova Súmula
            </Button>
        </div>
      </div>

      {isFormVisible && (
        <SumulaForm
          formData={formData}
          setFormData={setFormData}
          tribunais={tribunais}
          categories={categories}
          editingId={editingId}
          onSave={handleSubmit}
          onCancel={resetForm}
          onTopicCreated={(newTopic) => setCategories(prev => [...prev, newTopic].sort((a, b) => a.name.localeCompare(b.name)))}
        />
      )}

      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
         <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Súmulas Cadastradas ({filteredAndSortedSumulas.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="relative md:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar por título ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Select value={tribunalFilter} onValueChange={setTribunalFilter}>
            <SelectTrigger className="h-12"><SelectValue placeholder="Filtrar por tribunal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tribunais</SelectItem>
              {tribunais.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Popover open={topicFilterOpen} onOpenChange={setTopicFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={topicFilterOpen}
                className="w-full justify-between h-12"
              >
                <span className="truncate">{getTopicFilterLabel()}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Buscar tópico..." />
                <CommandList>
                  <CommandEmpty>Nenhum tópico encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setTopicFilter('all');
                        setTopicFilterOpen(false);
                      }}
                    >
                      <Check className={`mr-2 h-4 w-4 ${topicFilter === 'all' ? 'opacity-100' : 'opacity-0'}`} />
                      Todos os Tópicos
                    </CommandItem>
                    <CommandItem
                      onSelect={() => {
                        setTopicFilter('no-topics');
                        setTopicFilterOpen(false);
                      }}
                    >
                      <Check className={`mr-2 h-4 w-4 ${topicFilter === 'no-topics' ? 'opacity-100' : 'opacity-0'}`} />
                      Sem Tópicos
                    </CommandItem>
                    {categories.map((category) => (
                      <CommandItem
                        key={category.id}
                        value={category.name}
                        onSelect={() => {
                          setTopicFilter(category.id);
                          setTopicFilterOpen(false);
                        }}
                      >
                        <Check className={`mr-2 h-4 w-4 ${topicFilter === category.id ? 'opacity-100' : 'opacity-0'}`} />
                        {category.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Select value={faqFilter} onValueChange={setFaqFilter}>
            <SelectTrigger className="h-12">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 opacity-50"/>
                <SelectValue placeholder="Filtrar por FAQ..." />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Súmulas</SelectItem>
              <SelectItem value="no-faqs">Sem FAQs</SelectItem>
              <SelectItem value="with-faqs">Com FAQs</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="h-12">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 opacity-50"/>
                <SelectValue placeholder="Ordenar por..." />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt_desc">Mais Recentes</SelectItem>
              <SelectItem value="createdAt_asc">Mais Antigas</SelectItem>
              <SelectItem value="title_asc">Título (A-Z)</SelectItem>
              <SelectItem value="title_desc">Título (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <AnimatePresence>
          {selectedSumulas.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"
            >
              <h3 className="font-bold text-blue-800 mb-2">{selectedSumulas.length} súmula(s) selecionada(s)</h3>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-grow w-full sm:w-auto z-10">
                  <label className="text-sm font-medium text-blue-700 mb-1 block">Adicionar Tópicos em Massa</label>
                  <MultiSelectCombobox
                    options={topicOptions}
                    value={selectedBulkTopics}
                    onValueChange={handleBulkTopicChange}
                    placeholder="Selecione tópicos..."
                    className="w-full bg-white"
                  />
                </div>
                <Button onClick={handleBulkAddTopics} className="w-full sm:w-auto">
                  <Layers className="w-4 h-4 mr-2" />
                  Aplicar
                </Button>
                <Button
                  onClick={() => setGenModalStage('confirm')}
                  className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar FAQs com IA
                </Button>
                <Button
                  onClick={() => setTopicModalStage('confirm')}
                  className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Sugerir Tópicos com IA
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
            <div className="text-center py-12 text-gray-500">Carregando súmulas...</div>
        ) : (
            <>
                <div className="space-y-4">
                  {paginatedSumulas.length > 0 && (
                    <div className="flex items-center p-4">
                      <Checkbox
                        id="select-all"
                        checked={selectedSumulas.length === paginatedSumulas.length && paginatedSumulas.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <label htmlFor="select-all" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">
                        Selecionar todos na página
                      </label>
                    </div>
                  )}
                {paginatedSumulas.map((sumula) => (
                    <motion.div
                    key={sumula.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/90 rounded-xl shadow p-4 border border-gray-100 flex items-start gap-4"
                    >
                    <Checkbox
                      checked={selectedSumulas.includes(sumula.id)}
                      onCheckedChange={() => handleSelectSumula(sumula.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 flex justify-between items-start">
                        <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold rounded-full">
                              {sumula.tribunalName}
                          </span>
                          <Badge variant={sumula.faqCount > 0 ? 'secondary' : 'outline'} className={`flex items-center gap-1 text-xs ${sumula.faqCount > 0 ? 'bg-green-100 text-green-800' : 'text-gray-400'}`}>
                            <HelpCircle className="w-3 h-3" />
                            {sumula.faqCount > 0 ? `${sumula.faqCount} FAQ${sumula.faqCount > 1 ? 's' : ''}` : 'Sem FAQs'}
                          </Badge>
                        </div>
                        <Link to={`/sumula/${sumula.slug}`} target="_blank">
                            <h3 className="text-lg font-bold text-gray-800 mt-2 mb-1 hover:text-blue-600 transition-colors">
                            {sumula.title}
                            </h3>
                        </Link>
                        <div 
                            className="text-gray-600 text-sm line-clamp-2 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: sumula.content }}
                        />
                        {sumula.categoryObjects && sumula.categoryObjects.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Tag className="w-4 h-4 text-gray-500" />
                            {sumula.categoryObjects.map(topic => (
                                <Badge key={topic.id} variant="secondary" className="bg-blue-100 text-blue-800">
                                  {topic.name}
                                </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-500">
                            Publicado em: {sumula.publishDate ? new Date(sumula.publishDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Data não informada'}
                        </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(sumula)} className="hover:bg-blue-100"><Edit className="w-4 h-4" /></Button>
                         <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="hover:bg-red-100 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso irá deletar permanentemente a súmula.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(sumula)} className="bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        </div>
                    </div>
                    </motion.div>
                ))}

                {filteredAndSortedSumulas.length === 0 && !isFormVisible && (
                    <div className="text-center py-12 text-gray-500">
                    Nenhuma súmula encontrada com os filtros aplicados.
                    </div>
                )}
                </div>

                {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-4 mt-8">
                    <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium text-gray-700">Página {currentPage} de {totalPages}</span>
                    <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                )}
            </>
        )}
      </div>

    {/* FAQ Generation Modal */}
    <Dialog open={genModalStage !== null} onOpenChange={(open) => { if (!open && genModalStage !== 'processing') setGenModalStage(null); }}>
      <DialogContent className="sm:max-w-[500px]">
        {genModalStage === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Gerar FAQs com IA
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Você selecionou <strong>{selectedSumulas.length} súmula(s)</strong>. O Claude Haiku irá gerar 3 FAQs para cada uma.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Custo estimado: ~{selectedSumulas.length * 3} FAQs geradas com modelo Haiku.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGenModalStage(null)}>Cancelar</Button>
              <Button onClick={handleGenerateFaqs} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Agora
              </Button>
            </DialogFooter>
          </>
        )}

        {genModalStage === 'processing' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                Gerando FAQs...
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <p className="text-sm text-gray-600">
                Processando {genProgress.current} de {genProgress.total} súmulas...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${genProgress.total > 0 ? (genProgress.current / genProgress.total) * 100 : 0}%` }}
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {genProgress.results.map((result, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {result.status === 'ok'
                      ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    }
                    <span className="truncate text-gray-700">{result.title}</span>
                    {result.status === 'ok'
                      ? <span className="text-green-600 text-xs shrink-0">+{result.count} FAQs</span>
                      : <span className="text-red-500 text-xs shrink-0">{result.error}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {genModalStage === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Geração Concluída
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <p className="text-sm text-gray-600">
                {genProgress.results.filter(r => r.status === 'ok').length} de {genProgress.total} súmulas processadas com sucesso.
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {genProgress.results.map((result, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {result.status === 'ok'
                      ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    }
                    <span className="truncate text-gray-700">{result.title}</span>
                    {result.status === 'ok'
                      ? <span className="text-green-600 text-xs shrink-0">+{result.count} FAQs</span>
                      : <span className="text-red-500 text-xs shrink-0">{result.error}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setGenModalStage(null)}>Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>

    {/* Topic Suggestion Modal */}
    <Dialog open={topicModalStage !== null} onOpenChange={(open) => { if (!open && topicModalStage !== 'processing' && topicModalStage !== 'applying') setTopicModalStage(null); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">

        {topicModalStage === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-teal-600" />
                Sugerir Tópicos com IA
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Você selecionou <strong>{selectedSumulas.length} súmula(s)</strong>. O Claude Haiku irá analisar cada uma e sugerir de 1 a 3 tópicos relevantes.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                As sugestões serão exibidas para revisão antes de qualquer alteração no banco de dados. Tópicos já atribuídos à súmula serão ignorados automaticamente.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTopicModalStage(null)}>Cancelar</Button>
              <Button onClick={handleSuggestTopics} className="bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700">
                <Brain className="w-4 h-4 mr-2" />
                Analisar Agora
              </Button>
            </DialogFooter>
          </>
        )}

        {topicModalStage === 'processing' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
                Analisando Súmulas...
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <p className="text-sm text-gray-600">
                Processando {topicProgress.current} de {topicProgress.total} súmulas...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-teal-600 to-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${topicProgress.total > 0 ? (topicProgress.current / topicProgress.total) * 100 : 0}%` }}
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {topicSuggestions.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {s.error
                      ? <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      : <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    }
                    <span className="truncate text-gray-700">{s.sumuTitle}</span>
                    {s.error
                      ? <span className="text-red-500 text-xs shrink-0">{s.error}</span>
                      : <span className="text-teal-600 text-xs shrink-0">{s.suggestions.length} sugestão(ões)</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {topicModalStage === 'review' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-teal-600" />
                Revisar Sugestões de Tópicos
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500 px-1">Desmarque os tópicos que não deseja aplicar. Tópicos marcados como <span className="font-semibold text-orange-600">Novo</span> serão criados no banco de dados.</p>
            <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
              {topicSuggestions.map((sumuData, sumuIdx) => (
                <div key={sumuData.sumuId} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <p className="font-semibold text-gray-800 text-sm mb-3 line-clamp-1">{sumuData.sumuTitle}</p>
                  {sumuData.error ? (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{sumuData.error}</span>
                    </div>
                  ) : sumuData.suggestions.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Todos os tópicos sugeridos já estão atribuídos.</p>
                  ) : (
                    <div className="space-y-2">
                      {sumuData.suggestions.map((sug, sugIdx) => (
                        <div key={sugIdx} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                          <Checkbox
                            checked={sug.accepted}
                            onCheckedChange={() => toggleTopicSuggestion(sumuIdx, sugIdx)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-gray-800">{sug.topic_name}</span>
                              {sug.is_new && (
                                <Badge className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0">Novo</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{sug.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setTopicModalStage(null)}>Cancelar</Button>
              <Button
                onClick={handleApplyTopicSuggestions}
                disabled={!topicSuggestions.some(s => s.suggestions.some(sg => sg.accepted))}
                className="bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Aplicar Selecionados
              </Button>
            </DialogFooter>
          </>
        )}

        {topicModalStage === 'applying' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
                Aplicando Tópicos...
              </DialogTitle>
            </DialogHeader>
            <div className="py-8 flex justify-center">
              <p className="text-gray-500 text-sm">Salvando associações no banco de dados...</p>
            </div>
          </>
        )}

        {topicModalStage === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Tópicos Aplicados com Sucesso
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600">
                Os tópicos selecionados foram associados às súmulas. A lista foi atualizada automaticamente.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setTopicModalStage(null)}>Fechar</Button>
            </DialogFooter>
          </>
        )}

      </DialogContent>
    </Dialog>
    </div>
  );
};

export default SumulaManager;