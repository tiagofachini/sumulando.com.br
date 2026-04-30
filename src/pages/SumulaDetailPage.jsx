import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import { ExternalLink, BookOpen, Landmark, MessageSquarePlus, Tag, HelpCircle, Youtube } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShareButtons from '@/components/ShareButtons';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { supabase } from '@/lib/supabaseClient';

const FeedbackButton = ({ sumulaId, sumulaTitle, sumulaSlug, faqId, faqQuestion }) => {
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                onClick={() => setIsFeedbackOpen(true)}
            >
                <MessageSquarePlus className="w-4 h-4 mr-2" />
                Feedback
            </Button>
            <FeedbackDialog
                open={isFeedbackOpen}
                onOpenChange={setIsFeedbackOpen}
                sumulaId={sumulaId}
                sumulaTitle={sumulaTitle}
                sumulaSlug={sumulaSlug}
                faqId={faqId}
                faqQuestion={faqQuestion}
            />
        </>
    );
};

const getYoutubeEmbedUrl = (url) => {
  if (!url) return null;
  
  // Extract video ID from various YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  
  return null;
};

const SumulaDetailPage = () => {
  const { slug } = useParams();
  const [sumula, setSumula] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    setCurrentUrl(window.location.href);
    window.scrollTo(0, 0);

    const fetchSumula = async () => {
        if (!supabase) return;
        setLoading(true);

        const { data, error } = await supabase
            .rpc('get_sumula_details', { p_slug: slug })
            .single();

        if (error || !data) {
            console.error('Error fetching sumula details:', error);
            setSumula(null);
        } else {
            setSumula(data);
        }
        setLoading(false);
    };

    fetchSumula();
  }, [slug]);
  
  const handleRelatedClick = () => {
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow flex items-center justify-center bg-gray-50">
                <p className="text-xl text-gray-600">Carregando súmula...</p>
            </main>
            <Footer />
        </div>
    );
  }

  if (!sumula) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center bg-gray-50">
          <p className="text-xl text-gray-600">Súmula não encontrada.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const formattedPublishDate = sumula.publish_date ? new Date(sumula.publish_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Data não informada';
  
  const contentWithReference = `${sumula.content}
    <p>&nbsp;</p>
    ${sumula.reference_link ? 
      `<p class="text-sm text-gray-500 flex items-center">
        <a href="${sumula.reference_link}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link w-4 h-4 mr-2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" x2="21" y1="14" y2="3"/>
          </svg>
          Súmula publicada em: ${formattedPublishDate}
        </a>
      </p>` : `<p class="text-sm text-gray-500">Súmula publicada em: ${formattedPublishDate}</p>`
    }`;
    
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": sumula.faqs?.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  const youtubeEmbedUrl = getYoutubeEmbedUrl(sumula.youtube_url);

  return (
    <>
      <Helmet>
        <title>{`${sumula.title} - Sumulando`}</title>
        <meta name="description" content={sumula.content.substring(0, 160)} />
        <meta property="og:title" content={`${sumula.title} - Sumulando`} />
        <meta property="og:description" content={sumula.content.substring(0, 160)} />
        <meta property="og:image" content="https://horizons-cdn.hostinger.com/d74f9542-f4b8-44ac-931b-e7d3b882cbac/19ab7e2e664db850bc6e313bf2b5dcdb.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${sumula.title} - Sumulando`} />
        <meta name="twitter:description" content={sumula.content.substring(0, 160)} />
        <meta name="twitter:image" content="https://horizons-cdn.hostinger.com/d74f9542-f4b8-44ac-931b-e7d3b882cbac/19ab7e2e664db850bc6e313bf2b5dcdb.jpg" />

        {sumula.faqs && sumula.faqs.length > 0 && (
            <script type="application/ld+json">
                {JSON.stringify(faqSchema)}
            </script>
        )}
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-1051517207"></script>
        <script>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-1051517207');
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
              >
                <Card className="bg-white/80 backdrop-blur-xl shadow-xl border-white/20 rounded-2xl overflow-hidden mb-8">
                  <CardHeader className="p-8">
                    <div className="mb-4">
                      <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-full">
                        {sumula.tribunal_name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                        <CardTitle className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">
                            {sumula.title}
                        </CardTitle>
                        {sumula.topicos && sumula.topicos.length > 0 && (
                            <div className="flex flex-wrap gap-2 items-center">
                            {sumula.topicos.map((topic, index) => (
                                <Link to={`/busca?topico=${topic.id}`} key={index}>
                                <Badge
                                    variant="secondary"
                                    className="px-3 py-1 text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer"
                                >
                                    {topic.name}
                                </Badge>
                                </Link>
                            ))}
                            </div>
                        )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-8 pt-0">
                    {youtubeEmbedUrl && (
                      <div className="mb-8">
                        <div className="relative w-full bg-black rounded-xl overflow-hidden shadow-lg" style={{ paddingBottom: '56.25%' }}>
                          <iframe
                            className="absolute top-0 left-0 w-full h-full"
                            src={youtubeEmbedUrl}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          ></iframe>
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                          <Youtube className="w-4 h-4 text-red-600" />
                          <span className="font-medium">Vídeo explicativo sobre esta súmula</span>
                        </div>
                      </div>
                    )}

                    <div className="prose max-w-none">
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-l-4 border-blue-500">
                        <div
                          className="text-lg text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: contentWithReference }}
                        />
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="px-8 pb-6 flex justify-between items-center bg-gray-50/50 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium whitespace-nowrap">Compartilhe:</span>
                        <ShareButtons 
                            title={sumula.title} 
                            url={currentUrl} 
                        />
                      </div>
                      <FeedbackButton sumulaId={sumula.id} sumulaTitle={sumula.title} sumulaSlug={sumula.slug} />
                  </CardFooter>
                </Card>

                {sumula.faqs && sumula.faqs.length > 0 && (
                  <motion.div
                    className="mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                  >
                    <Card className="bg-white/80 backdrop-blur-xl shadow-xl border-white/20 rounded-2xl overflow-hidden">
                      <CardHeader>
                        <CardTitle className="flex items-center text-2xl font-bold text-gray-800">
                            <HelpCircle className="mr-3 h-6 w-6"/>
                            Perguntas Frequentes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                          {sumula.faqs.map((faq, index) => (
                            <AccordionItem value={`item-${index}`} key={faq.id}>
                              <AccordionTrigger className="text-left font-semibold text-lg hover:no-underline">
                                {faq.question}
                              </AccordionTrigger>
                              <AccordionContent className="text-base text-gray-600 leading-relaxed pt-2 prose">
                                {faq.answer}
                                <div className="not-prose text-right mt-4">
                                     <FeedbackButton
                                        faqId={faq.id}
                                        faqQuestion={faq.question}
                                        sumulaId={sumula.id}
                                        sumulaSlug={sumula.slug}
                                    />
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {sumula.related_sumulas && sumula.related_sumulas.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                  >
                     <Card className="bg-white/80 backdrop-blur-xl shadow-xl border-white/20 rounded-2xl overflow-hidden">
                        <CardHeader>
                            <CardTitle className="flex items-center text-2xl font-bold text-gray-800">
                                <BookOpen className="mr-3 h-6 w-6"/>
                                Súmulas Relacionadas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {sumula.related_sumulas.map(related => (
                                    <Link to={`/sumula/${related.slug}`} key={related.id} onClick={handleRelatedClick} className="block group">
                                      <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200">
                                          <h4 className="font-bold text-blue-700 group-hover:underline">{related.title}</h4>
                                          <div 
                                            className="text-sm text-gray-600 line-clamp-2 mt-1 prose-sm"
                                            dangerouslySetInnerHTML={{ __html: related.content }}
                                          />
                                          <div className="flex flex-wrap items-center gap-2 mt-3">
                                              <Badge variant="secondary" className="flex items-center gap-1.5">
                                                  <Landmark className="h-3 w-3" />
                                                  {related.tribunal_name}
                                              </Badge>
                                              {related.common_topics?.map(topic => (
                                                  <Link 
                                                      to={`/busca?topico=${topic.id}`} 
                                                      key={topic.id} 
                                                      onClick={(e) => e.stopPropagation()} 
                                                      className="relative z-10"
                                                  >
                                                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer">
                                                          {topic.name}
                                                      </Badge>
                                                  </Link>
                                              ))}
                                          </div>
                                      </div>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                     </Card>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default SumulaDetailPage;