import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, ExternalLink } from 'lucide-react';

const Footer = () => {
  const footerLinks = [
    { name: 'Sobre', path: '/institucional/sobre' },
    { name: 'Termos de Uso e Política de Privacidade', path: '/institucional/termos-de-uso' },
    { name: 'Contato', path: '/institucional/contato' },
  ];

  const partnerLinks = [
    { name: 'penhora.app.br', url: 'https://penhora.app.br' },
    { name: 'agendar.adv.br', url: 'https://agendar.adv.br' },
  ];

  return (
    <footer className="bg-white/80 backdrop-blur-xl border-t border-gray-200/80 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          {/* Brand Section */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center mb-4">
              <Scale className="w-6 h-6 text-blue-600" />
              <span className="ml-2 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Sumulando
              </span>
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Sumulando.
            </p>
          </div>

          {/* Main Links Section */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
              Links
            </h3>
            <nav className="flex flex-col gap-2">
              {footerLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-gray-600 hover:text-blue-600 transition-colors duration-200 text-sm"
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Partner Offerings Section */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
              Conheça também
            </h3>
            <nav className="flex flex-col gap-2">
              {partnerLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-blue-600 transition-colors duration-200 text-sm inline-flex items-center gap-1"
                >
                  {link.name}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;