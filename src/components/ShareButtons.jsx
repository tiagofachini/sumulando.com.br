import React from 'react';
import { motion } from 'framer-motion';
import { Linkedin, Mail, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

// Custom X/Twitter Icon SVG as a React component
const XIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    {...props}
    fill="currentColor"
  >
    <g>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
    </g>
  </svg>
);

// Custom WhatsApp Icon
const WhatsAppIcon = (props) => (
    <svg 
        viewBox="0 0 24 24"
        {...props}
        fill="currentColor"
    >
        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zM12.04 20.1c-1.53 0-3.01-.4-4.3-1.13L6.9 19.3l.41.24-3.42.9.9-3.42.24.41-.34-.84c-.8-1.35-1.28-2.91-1.28-4.58 0-4.54 3.69-8.23 8.23-8.23 4.54 0 8.23 3.69 8.23 8.23s-3.69 8.23-8.23 8.23zm4.49-5.83c-.26-.13-1.53-.76-1.77-.84-.24-.08-.42-.13-.59.13-.17.26-.67.84-.82 1.01-.15.17-.3.19-.56.06-.26-.13-1.08-.4-2.06-1.27-.76-.66-1.28-1.48-1.43-1.74-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.08-.17.04-.31-.02-.43s-.59-1.43-.81-1.95c-.22-.53-.44-.45-.59-.46-.14-.01-.31-.01-.48-.01-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.43 1.03 2.6c.13.17 1.77 2.7 4.29 3.78 2.52 1.08 2.52.72 2.97.69.45-.03 1.53-.62 1.74-.81.22-.19.22-.35.15-.48z"/>
    </svg>
);


const ShareButtons = ({ title, url }) => {
  const { toast } = useToast();
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle}%20%0A%0A${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
    email: `mailto:?subject=${encodedTitle}&body=Confira esta súmula:%0A%0A${encodedTitle}%0A${encodedUrl}`,
  };

  const trackShare = (method) => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'share', {
        'event_category': 'Social',
        'event_label': title,
        'method': method,
        'content_url': url,
      });
    }
  };

  const openShareWindow = (shareUrl, method) => {
    trackShare(method);
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const copyToClipboard = () => {
    trackShare('Copy');
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link Copiado!",
        description: "O link da súmula foi copiado para a área de transferência.",
      });
    }, (err) => {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    });
  };

  return (
    <div className="flex items-center gap-1">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button variant="ghost" size="icon" onClick={() => openShareWindow(shareLinks.whatsapp, 'WhatsApp')} className="text-gray-500 hover:text-green-600 hover:bg-green-100">
            <WhatsAppIcon className="w-5 h-5" />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button variant="ghost" size="icon" onClick={() => openShareWindow(shareLinks.twitter, 'Twitter')} className="text-gray-500 hover:text-gray-800 hover:bg-gray-100">
            <XIcon className="w-4 h-4" />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button variant="ghost" size="icon" onClick={() => openShareWindow(shareLinks.linkedin, 'LinkedIn')} className="text-gray-500 hover:text-sky-700 hover:bg-sky-100">
            <Linkedin className="w-5 h-5" />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button variant="ghost" size="icon" onClick={() => openShareWindow(shareLinks.email, 'Email')} className="text-gray-500 hover:text-red-600 hover:bg-red-100">
            <Mail className="w-5 h-5" />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button variant="ghost" size="icon" onClick={copyToClipboard} className="text-gray-500 hover:text-blue-600 hover:bg-blue-100">
            <Copy className="w-5 h-5" />
          </Button>
        </motion.div>
    </div>
  );
};

export default ShareButtons;