import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
        setLoading(false);
        console.warn("Supabase client not available. Make sure integration is complete.");
        return;
    }

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        handleSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signInWithOAuth = useCallback(async (provider) => {
    if (!supabase) {
        toast({
            variant: "destructive",
            title: "Integração Incompleta",
            description: "O cliente Supabase não está disponível.",
        });
        return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Login Falhou",
        description: error.message || "Algo deu errado",
      });
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    if (!supabase) {
        toast({
            variant: "destructive",
            title: "Integração Incompleta",
            description: "O cliente Supabase não está disponível.",
        });
        return;
    }
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({
        variant: "destructive",
        title: "Logout Falhou",
        description: error.message || "Algo deu errado",
      });
    }
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signInWithOAuth,
    signOut,
  }), [user, session, loading, signInWithOAuth, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};