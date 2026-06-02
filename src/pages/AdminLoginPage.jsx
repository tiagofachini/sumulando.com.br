import React, { useState } from 'react';
    import { Helmet } from 'react-helmet';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Lock, User, LogIn } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { useToast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';

    const AdminLoginPage = () => {
      const navigate = useNavigate();
      const { toast } = useToast();
      const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      const [loading, setLoading] = useState(false);

      const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
          const { data, error } = await supabase.functions.invoke('admin-login', {
            body: JSON.stringify({ username, password }),
          });

          if (error) {
            throw error;
          }

          if (data.success) {
            localStorage.setItem('isAdminLoggedIn', 'true');
            toast({
              title: "Login realizado com sucesso!",
              description: "Bem-vindo ao painel administrativo.",
            });
            navigate('/admfachini/dashboard');
          } else {
            toast({
              title: "Erro no login",
              description: data.message || "Usuário ou senha incorretos.",
              variant: "destructive",
            });
          }
        } catch (err) {
          console.error('Login error:', err);
          toast({
            title: "Erro no servidor",
            description: "Não foi possível conectar ao servidor de autenticação. Tente novamente mais tarde.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };

      return (
        <>
          <Helmet>
            <title>Login Administrativo - Sumulando</title>
            <meta name="robots" content="noindex, nofollow" />
            <meta name="description" content="Área administrativa do Sumulando" />
          </Helmet>

          <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-md"
            >
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Área Administrativa
                  </h1>
                  <p className="text-gray-600">
                    Faça login para gerenciar o sistema
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <Label htmlFor="username" className="text-gray-700 font-semibold mb-2 block">
                      Usuário
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Digite seu usuário"
                        className="pl-10 h-12 rounded-xl border-2"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-gray-700 font-semibold mb-2 block">
                      Senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Digite sua senha"
                        className="pl-10 h-12 rounded-xl border-2"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                    disabled={loading}
                  >
                    {loading ? 'Verificando...' : (
                      <>
                        <LogIn className="w-5 h-5 mr-2" />
                        Entrar
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      );
    };

    export default AdminLoginPage;