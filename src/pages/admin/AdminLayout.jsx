import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Tag, Landmark, LogOut, Building, FileQuestion, MessageSquare as MessageSquareQuote, ChevronLeft, ChevronRight, Scale } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admfachini');
  };

  const navItems = [
    { href: '/admfachini/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admfachini/sumulas', icon: FileText, label: 'Súmulas' },
    { href: '/admfachini/topicos', icon: Tag, label: 'Tópicos' },
    { href: '/admfachini/tribunais', icon: Landmark, label: 'Tribunais' },
    { href: '/admfachini/institucional', icon: Building, label: 'Institucional' },
    { href: '/admfachini/faqs', icon: FileQuestion, label: 'FAQs' },
    { href: '/admfachini/feedbacks', icon: MessageSquareQuote, label: 'Feedbacks' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <TooltipProvider delayDuration={0}>
        <aside className={`bg-white shadow-md flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
          <div className={`p-4 border-b flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
             <Link to="/" className="flex items-center space-x-2 overflow-hidden">
                <Scale className="w-8 h-8 text-blue-600 flex-shrink-0" />
                {!isCollapsed && (
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent whitespace-nowrap">
                        Sumulando
                    </span>
                )}
            </Link>
          </div>
          <nav className="flex-grow p-2">
            <ul>
              {navItems.map((item) => (
                <li key={item.href}>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.href}
                          className={`flex items-center justify-center h-12 my-1 rounded-lg transition-colors ${
                            location.pathname === item.href
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <item.icon className="w-6 h-6" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="ml-2">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link
                      to={item.href}
                      className={`flex items-center px-4 py-3 my-1 rounded-lg transition-colors ${
                        location.pathname === item.href
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          <div className={`p-2 border-t`}>
            {isCollapsed ? (
                 <Tooltip>
                    <TooltipTrigger asChild>
                         <Button
                            onClick={handleSignOut}
                            variant="ghost"
                            className="w-full h-12 flex items-center justify-center text-gray-600 hover:bg-red-100 hover:text-red-600"
                        >
                            <LogOut className="w-6 h-6" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">Sair</TooltipContent>
                 </Tooltip>
            ) : (
                 <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    className="w-full flex items-center justify-start text-gray-600 hover:bg-red-100 hover:text-red-600 px-4 py-3"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Sair
                  </Button>
            )}

             <Button
                onClick={() => setIsCollapsed(!isCollapsed)}
                variant="ghost"
                className="w-full h-12 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                {isCollapsed ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
              </Button>
          </div>
        </aside>
      </TooltipProvider>

      <main className="flex-1 p-6 md:p-10 relative">
        <div className="bg-gray-100" style={{
            backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1,
            opacity: 0.5
        }}></div>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;