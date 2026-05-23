import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { slugify } from '@/lib/utils';

const SITE_URL = 'https://sumulando.com.br';
import { motion } from 'framer-motion';
import { Calendar, Loader2, Search, Landmark, Tag } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import ShareButtons from '@/components/ShareButtons';

const PAGE_SIZE = 100;

const isUUID = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// Highlights `term` inside an HTML string (replaces only inside text nodes)
const highlightHtml = (html, term) => {
  if (!term || !html) return html;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'gi');
  return html.replace(/>([^<]+)</g, (_, text) =>
    '>' + text.replace(re, '<mark class="bg-yellow-100 rounded-sm px-0.5 not-italic">$1</mark>') + '<'
  );
};

// Highlights `term` in a plain text string
const highlightPlain = (text, term) => {
  if (!term || !text) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark class="bg-yellow-100 rounded-sm px-0.5">$1</mark>'
  );
};

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [tribunais, setTribunais] = useState([]);
  const [topicsMap, setTopicsMap] = useState(null);
  const observer = useRef();

  const query = searchParams.get('q');
  const tribunaisParams = useMemo(() => searchParams.getAll('tribunal'), [searchParams]);
  const topicsParams = useMemo(() => searchParams.getAll('topico'), [searchParams]);

  useEffect(() => {
    const fetchTribunais = async () => {
        if (!supabase) return;
        const { data } = await supabase.from('tribunais').select('id, name');
        setTribunais(data || []);
    };
    fetchTribunais();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const fetchTopicsMap = async () => {
      const { data } = await supabase.from('topicos').select('id, slug, name');
      const map = { slugToId: {}, idToSlug: {}, slugToName: {} };
      (data || []).forEach(t => {
        if (t.slug) {
          map.slugToId[t.slug] = t.id;
          map.idToSlug[t.id] = t.slug;
          map.slugToName[t.slug] = t.name;
        }
      });
      setTopicsMap(map);
    };
    fetchTopicsMap();
  }, []);

  // Redirect old UUID-based topic URLs to slug-based URLs
  useEffect(() => {
    if (!topicsMap || !topicsParams.some(isUUID)) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('topico');
    topicsParams.forEach(p => newParams.append('topico', isUUID(p) ? (topicsMap.idToSlug[p] || p) : p));
    navigate(`/busca?${newParams.toString()}`, { replace: true });
  }, [topicsMap, topicsParams, searchParams, navigate]);

  const resolvedTopicIds = useMemo(() => {
    if (!topicsMap) return topicsParams;
    return topicsParams.map(p => isUUID(p) ? p : (topicsMap.slugToId[p] || p));
  }, [topicsMap, topicsParams]);

  const hasUUIDs = topicsParams.some(isUUID);
  const hasSlugs = topicsParams.some(p => !isUUID(p));
  const isReady = !hasUUIDs && (!hasSlugs || topicsMap !== null);

  const fetchResults = useCallback(async (currentPage) => {
    if (!supabase) return;
    
    if (currentPage === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const rpcParams = {
      p_query: query || '',
      p_tribunais: tribunaisParams.length > 0 ? tribunaisParams : null,
      p_topicos: resolvedTopicIds.length > 0 ? resolvedTopicIds : null,
      p_limit: PAGE_SIZE,
      p_offset: currentPage * PAGE_SIZE,
    };

    const { data, error } = await supabase.rpc('search_sumulas_with_count', rpcParams);

    if (error) {
      console.error("Error fetching search results:", error);
      setResults([]);
      setTotalCount(0);
    } else {
      let newResults = data.sumulas_data || [];
      if (!query) {
        for (let i = newResults.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newResults[i], newResults[j]] = [newResults[j], newResults[i]];
        }
      }
      setResults(prev => currentPage === 0 ? newResults : [...prev, ...newResults]);
      setTotalCount(data.total_count || 0);
      setHasMore(newResults.length === PAGE_SIZE);
    }
    
    if (currentPage === 0) {
      setLoading(false);
    } else {
      setLoadingMore(false);
    }
  }, [query, tribunaisParams, resolvedTopicIds]);

  // Reset and fetch on filter change (wait for slug→ID resolution when topic params present)
  useEffect(() => {
    if (!isReady) return;
    setResults([]);
    setPage(0);
    setHasMore(true);
    setTotalCount(0);
    fetchResults(0);
  }, [fetchResults, isReady]);

  // Infinite scroll observer
  const lastElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  // Fetch more data when page changes
  useEffect(() => {
    if (page > 0) {
      fetchResults(page);
    }
  }, [page, fetchResults]);

  const getTribunalName = (id) => tribunais.find(t => t.id === id)?.name || id.toUpperCase();
  const getTopicName = (slug) => topicsMap?.slugToName?.[slug] || slug;
  
  const getSearchTermText = () => {
    let text = [];
    if(query) text.push(`"${query}"`);
    if(tribunaisParams.length > 0) {
        const names = tribunaisParams.map(getTribunalName).join(', ');
        text.push(`nos tribunais: ${names}`);
    }
    return text.join(' ');
  }

  const handleActionClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // noindex only for UUID topic params (legacy) or plain /busca with no filters.
  const hasUUIDTopics = topicsParams.some(isUUID);
  const hasNoParams = !query && topicsParams.length === 0 && tribunaisParams.length === 0;
  const isNoIndex = hasUUIDTopics || hasNoParams;

  const isTopicSlugPage = !query && topicsParams.length > 0 && !hasUUIDTopics && tribunaisParams.length === 0;
  const topicNames = topicsParams.map(getTopicName).join(', ');

  const pageTitle = isTopicSlugPage
    ? `Súmulas sobre ${topicNames} — Sumulando`
    : `Resultados da busca ${getSearchTermText()} — Sumulando`;

  const pageDescription = isTopicSlugPage
    ? `Veja todas as súmulas dos principais tribunais brasileiros sobre ${topicNames}. Pesquise, estude e compare jurisprudência no Sumulando.`
    : `Resultados da busca por ${query || 'súmulas'} no Sumulando.`;

  const canonicalParts = [];
  if (query) canonicalParts.push(`q=${encodeURIComponent(query)}`);
  topicsParams.filter(p => !isUUID(p)).forEach(s => canonicalParts.push(`topico=${encodeURIComponent(s)}`));
  tribunaisParams.forEach(t => canonicalParts.push(`tribunal=${encodeURIComponent(t)}`));
  const canonicalUrl = canonicalParts.length > 0
    ? `${SITE_URL}/busca?${canonicalParts.join('&')}`
    : `${SITE_URL}/busca`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        {isNoIndex && <meta name="robots" content="noindex, follow" />}
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://horizons-cdn.hostinger.com/d74f9542-f4b8-44ac-931b-e7d3b882cbac/19ab7e2e664db850bc6e313bf2b5dcdb.jpg" />
        <meta property="og:image:alt" content="Sumulando - Balança da Justiça" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content="https://horizons-cdn.hostinger.com/d74f9542-f4b8-44ac-931b-e7d3b882cbac/19ab7e2e664db850bc6e313bf2b5dcdb.jpg" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": isTopicSlugPage ? "CollectionPage" : "SearchResultsPage",
                "@id": `${canonicalUrl}#webpage`,
                "url": canonicalUrl,
                "name": pageTitle,
                "isPartOf": { "@id": `${SITE_URL}/#website` },
                "inLanguage": "pt-BR",
                ...(totalCount > 0 && { "numberOfItems": totalCount })
              },
              {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  { "@type": "ListItem", "position": 1, "name": "Início", "item": SITE_URL },
                  { "@type": "ListItem", "position": 2, "name": "Busca", "item": `${SITE_URL}/busca` },
                  ...(isTopicSlugPage ? [{ "@type": "ListItem", "position": 3, "name": topicNames, "item": canonicalUrl }] : [])
                ]
              },
              ...(!loading && results.length > 0 ? [{
                "@type": "ItemList",
                "name": pageTitle,
                "numberOfItems": totalCount,
                "itemListElement": results.slice(0, 20).map((sumula, index) => ({
                  "@type": "ListItem",
                  "position": index + 1,
                  "name": sumula.title,
                  "url": `${SITE_URL}/sumula/${sumula.slug}`
                }))
              }] : [])
            ]
          })}
        </script>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-B3DPVRHY5H"></script>
        <script>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-B3DPVRHY5H');
          `}
        </script>
      </Helmet>
      
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-8 pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <h1 className="text-3xl font-bold text-gray-800">
                  {isTopicSlugPage ? `Súmulas sobre ${topicNames}` : 'Resultados da busca'}
                </h1>
                {!loading && (
                  <>
                    <p className="text-gray-600 mt-2">
                      Exibindo {results.length} resultado(s) de {totalCount} encontrados.
                    </p>
                    {(query || tribunaisParams.length > 0 || topicsParams.length > 0) && (
                      <div className="flex flex-wrap gap-2 mt-3 items-center">
                        <span className="text-sm text-gray-400 shrink-0">Filtros:</span>
                        {query && (
                          <Badge variant="outline" className="text-sm gap-1 border-blue-300 text-blue-700 bg-blue-50">
                            <Search className="w-3 h-3" />
                            "{query}"
                          </Badge>
                        )}
                        {tribunaisParams.map(id => (
                          <Badge key={id} className="text-sm gap-1 bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-0">
                            <Landmark className="w-3 h-3" />
                            {getTribunalName(id)}
                          </Badge>
                        ))}
                        {topicsParams.map(slug => (
                          <Badge key={slug} className="text-sm gap-1 bg-purple-100 text-purple-800 hover:bg-purple-100 border-0">
                            <Tag className="w-3 h-3" />
                            {getTopicName(slug)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>

              <div className="space-y-6">
                {loading ? (
                   <div className="text-center py-16">
                      <p className="text-xl text-gray-500">Buscando...</p>
                   </div>
                ) : results.length > 0 ? (
                  results.map((sumula, index) => {
                    const isLastElement = results.length === index + 1;
                    return (
                      <motion.div
                        key={`${sumula.id}-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index < PAGE_SIZE ? index * 0.05 : 0 }}
                        ref={isLastElement ? lastElementRef : null}
                      >
                        <Link to={`/sumula/${sumula.slug}`} className="block">
                          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20 hover:shadow-2xl hover:border-blue-300 transition-all duration-300 group">
                              <div className="mb-3">
                                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold rounded-full">
                                  {getTribunalName(sumula.tribunal_id)}
                                  </span>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
                                  <h2
                                      className="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors"
                                      dangerouslySetInnerHTML={{ __html: query ? highlightPlain(sumula.title, query) : sumula.title }}
                                  />
                                  {sumula.topics && sumula.topics.length > 0 && (
                                      <div className="flex items-center flex-wrap gap-2" onClick={handleActionClick}>
                                          {sumula.topics.map(topic => (
                                              <Link to={`/busca?topico=${slugify(topic.name)}`} key={topic.id} className="z-10 relative">
                                                  <Badge variant="secondary" className="px-2.5 py-0.5 text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer">{topic.name}</Badge>
                                              </Link>
                                          ))}
                                      </div>
                                  )}
                              </div>
                              
                              <div
                                className="text-gray-600 line-clamp-3 mb-4 prose-sm"
                                dangerouslySetInnerHTML={{ __html: query ? highlightHtml(sumula.content, query) : sumula.content }}
                              />

                              <div className="flex flex-wrap items-center justify-between text-sm text-gray-500 gap-4 mt-4 pt-4 border-t border-gray-100">
                                  <div className="flex items-center">
                                      <Calendar className="w-4 h-4 mr-1.5" />
                                      <span>
                                          Súmula publicada em: {new Date(sumula.publish_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                                      </span>
                                  </div>
                                  <div onClick={handleActionClick} className="z-10 relative flex items-center gap-2">
                                      <span className="text-gray-600 font-medium">Compartilhe:</span>
                                      <ShareButtons
                                          title={sumula.title}
                                          url={`${window.location.origin}/sumula/${sumula.slug}`}
                                      />
                                  </div>
                              </div>
                          </div>
                        </Link>
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="text-center py-16">
                    <p className="text-xl text-gray-500">Nenhuma súmula encontrada.</p>
                    <p className="text-gray-400 mt-2">Tente refinar sua busca.</p>
                  </div>
                )}
                {loadingMore && (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <span className="ml-4 text-gray-600">Carregando mais súmulas...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default SearchResultsPage;