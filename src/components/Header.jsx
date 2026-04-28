import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Scale, Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/MultiSelectCombobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [initialSearchTerm, setInitialSearchTerm] = useState('');
  const [selectedTribunais, setSelectedTribunais] = useState([]);
  const [tribunais, setTribunais] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [key, setKey] = useState(Date.now());

  useEffect(() => {
    const fetchInitialData = async () => {
        if (!supabase) return;
        setIsDataLoaded(false);
        const { data: tribunaisData } = await supabase.from('tribunais').select('id, name');
        
        const tribunalOptions = tribunaisData?.map(t => ({ value: t.id, label: t.name })) || [];
        setTribunais(tribunalOptions);

        const tribunalParams = searchParams.getAll('tribunal');
        const currentSelectedTribunais = tribunalOptions.filter(trib => tribunalParams.includes(trib.value));
        setSelectedTribunais(currentSelectedTribunais);

        const topicParams = searchParams.getAll('topico');

        const tribunalIds = currentSelectedTribunais.map(t => t.value);
        const { data: topicsData } = await supabase.rpc('get_topics_by_tribunais', { p_tribunal_ids: tribunalIds.length > 0 ? tribunalIds : null });

        const topicOptions = topicsData?.map(t => ({ value: t.id, label: t.name, slug: slugify(t.name) })) || [];
        setTopics(topicOptions);

        setInitialSearchTerm(searchParams.get('q') || '');
        setSelectedTopics(topicOptions.filter(cat => topicParams.includes(cat.slug) || topicParams.includes(cat.value)));
        
        setIsDataLoaded(true);
        setKey(Date.now()); // Reset the key to re-mount SearchForm with new initial values
    };
    fetchInitialData();
  }, [location.search]);

  const handleSearch = (currentSearchTerm, currentSelectedTribunais, currentSelectedTopics) => {
    const params = new URLSearchParams();
    if (currentSearchTerm) params.append('q', currentSearchTerm);
    currentSelectedTribunais.forEach(trib => params.append('tribunal', trib.value));
    currentSelectedTopics.forEach(cat => params.append('topico', cat.slug || slugify(cat.label)));
    
    setIsMobileMenuOpen(false);
    
    navigate(`/busca?${params.toString()}`);
  };

  const SearchForm = ({ isMobile, initialValues }) => {
    const [localSearchTerm, setLocalSearchTerm] = useState(initialValues.searchTerm);
    const [localSelectedTribunais, setLocalSelectedTribunais] = useState(initialValues.selectedTribunais);
    const [localSelectedTopics, setLocalSelectedTopics] = useState(initialValues.selectedTopics);
    const [localTopicsOptions, setLocalTopicsOptions] = useState(topics);

    useEffect(() => {
        setLocalSearchTerm(initialValues.searchTerm);
        setLocalSelectedTribunais(initialValues.selectedTribunais);
        
        // When initial values change, we must also update the local topics options
        // and filter the selected topics based on the new available options.
        const newTopicOptions = topics;
        setLocalTopicsOptions(newTopicOptions);

        const newTopicValues = newTopicOptions.map(t => t.value);
        const filteredSelectedTopics = initialValues.selectedTopics.filter(t => newTopicValues.includes(t.value));
        setLocalSelectedTopics(filteredSelectedTopics);

    }, [initialValues]);

    const handleTribunalChange = useCallback(async (newSelectedTribunais) => {
        setLocalSelectedTribunais(newSelectedTribunais);
        
        const tribunalIds = newSelectedTribunais.map(t => t.value);
        const { data: topicsData } = await supabase.rpc('get_topics_by_tribunais', { p_tribunal_ids: tribunalIds.length > 0 ? tribunalIds : null });
        const newTopicOptions = topicsData?.map(t => ({ value: t.id, label: t.name, slug: slugify(t.name) })) || [];
        setLocalTopicsOptions(newTopicOptions);
        
        // Remove selected topics that are no longer in the options list
        const newTopicValues = newTopicOptions.map(t => t.value);
        setLocalSelectedTopics(prev => prev.filter(t => newTopicValues.includes(t.value)));

    }, []);

    const onSearchClick = () => {
        handleSearch(localSearchTerm, localSelectedTribunais, localSelectedTopics);
    }

    const onKeyPress = (e) => {
        if (e.key === 'Enter') {
            onSearchClick();
        }
    };
    
    return (
      <div className={isMobile ? "space-y-4" : "grid grid-cols-12 gap-2 items-start"}>
          <div className={`relative ${isMobile ? 'col-span-12' : 'col-span-5'}`}>
              <Input
                  type="text"
                  placeholder="Buscar por termos, súmulas..."
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                  onKeyPress={onKeyPress}
                  className="pl-4 h-14 text-base rounded-xl border-2"
              />
          </div>
          <div className={isMobile ? 'col-span-12' : 'col-span-3'}>
              <MultiSelectCombobox
                  options={tribunais}
                  value={localSelectedTribunais}
                  onValueChange={handleTribunalChange}
                  placeholder="Tribunais"
                  className="h-14"
                  maxDisplay={1}
              />
          </div>
           <div className={isMobile ? 'col-span-12' : 'col-span-3'}>
                <MultiSelectCombobox
                    options={localTopicsOptions}
                    value={localSelectedTopics}
                    onValueChange={setLocalSelectedTopics}
                    placeholder="Tópicos"
                    className="h-14"
                    maxDisplay={1}
                />
           </div>
          <div className={isMobile ? 'col-span-12' : 'col-span-1'}>
              <Button onClick={onSearchClick} className="h-14 w-full bg-gradient-to-r from-blue-600 to-purple-600">
                  {isMobile ? <span className="mr-2">Buscar</span> : <Search className="h-6 w-6" />}
              </Button>
          </div>
      </div>
    );
  };
  
  const initialFormValues = {
    searchTerm: initialSearchTerm,
    selectedTribunais,
    selectedTopics
  };

  return (
    <header className="bg-white/80 backdrop-blur-xl shadow-md sticky top-0 z-40 border-b border-white/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link to="/" className="flex items-center space-x-2">
            <Scale className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Sumulando
            </span>
          </Link>
          
          {isDataLoaded && (
            <div className="hidden lg:flex flex-grow max-w-4xl ml-8">
              <SearchForm key={key} isMobile={false} initialValues={initialFormValues} />
            </div>
          )}

          <div className="lg:hidden">
            <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Faça sua busca</DialogTitle>
                </DialogHeader>
                {isDataLoaded && (
                  <div className="py-4">
                    <SearchForm key={key} isMobile={true} initialValues={initialFormValues} />
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;