import React, { useState, useEffect, useCallback } from 'react';
    import { motion } from 'framer-motion';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useToast } from '@/components/ui/use-toast';
    import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

    const ManageUsersPage = () => {
      const { toast } = useToast();
      const [users, setUsers] = useState([]);
      const [loading, setLoading] = useState(true);
      const [isFormVisible, setIsFormVisible] = useState(false);
      const [editingUser, setEditingUser] = useState(null);
      const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
      });

      const fetchUsers = useCallback(async () => {
        setLoading(true);
        // Supabase Edge Functions are recommended for listing auth users
        // For simplicity here, we'll fetch from profiles table.
        const { data: profiles, error } = await supabase.from('profiles').select('*');

        if (error) {
          toast({ title: 'Erro ao buscar usuários', description: error.message, variant: 'destructive' });
        } else {
          setUsers(profiles);
        }
        setLoading(false);
      }, [toast]);

      useEffect(() => {
        fetchUsers();
      }, [fetchUsers]);

      const resetForm = () => {
        setIsFormVisible(false);
        setEditingUser(null);
        setFormData({ full_name: '', email: '', password: '' });
      };

      const handleAddNew = () => {
        resetForm();
        setIsFormVisible(true);
      };

      const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({ full_name: user.full_name, email: user.email || '', password: '' });
        setIsFormVisible(true);
        window.scrollTo(0, 0);
      };

      const handleSubmit = async () => {
        if (editingUser) {
          // Update user profile
          const { error } = await supabase
            .from('profiles')
            .update({ full_name: formData.full_name })
            .eq('id', editingUser.id);
          
          if (error) {
            toast({ title: 'Erro ao atualizar usuário', description: error.message, variant: 'destructive' });
          } else {
            toast({ title: 'Sucesso!', description: 'Usuário atualizado.' });
            fetchUsers();
            resetForm();
          }
        } else {
          // Create new user
          if (!formData.email || !formData.password) {
            toast({ title: "Erro", description: "Email e senha são obrigatórios para novos usuários.", variant: "destructive" });
            return;
          }
          const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                full_name: formData.full_name,
              },
            },
          });

          if (error) {
            toast({ title: 'Erro ao criar usuário', description: error.message, variant: 'destructive' });
          } else {
            toast({ title: 'Sucesso!', description: 'Usuário criado. Verifique o e-mail para confirmação.' });
            fetchUsers();
            resetForm();
          }
        }
      };

      const handleDeleteUser = async (userId) => {
        toast({ title: 'Funcionalidade em desenvolvimento', description: "A exclusão de usuários requer configuração de admin no backend." });
        // Deleting auth users requires admin privileges, best handled with a secure Supabase Edge Function.
      };

      if (loading && !isFormVisible) {
        return <div className="text-center p-8">Carregando usuários...</div>;
      }

      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
              Gerenciar Usuários ({users.length})
            </h2>
            <Button
              onClick={handleAddNew}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Novo Usuário
            </Button>
          </div>

          {isFormVisible && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
                 <Button variant="outline" onClick={resetForm}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700 font-semibold mb-2 block">Nome Completo</Label>
                  <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Nome do usuário" />
                </div>
                {!editingUser && (
                  <>
                    <div>
                      <Label className="text-gray-700 font-semibold mb-2 block">Email</Label>
                      <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" />
                    </div>
                    <div>
                      <Label className="text-gray-700 font-semibold mb-2 block">Senha</Label>
                      <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Senha forte" />
                    </div>
                  </>
                )}
                 <Button onClick={handleSubmit} className="w-full h-12 text-lg rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Save className="w-5 h-5 mr-2" />
                    {editingUser ? 'Atualizar Usuário' : 'Salvar Usuário'}
                </Button>
              </div>
            </motion.div>
          )}

          <div className="space-y-4">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={user.avatar_url} alt={user.full_name} />
                    <AvatarFallback>{user.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-800">{user.full_name || 'Usuário sem nome'}</p>
                    <p className="text-sm text-gray-500">{user.email || user.id}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                   <Button size="sm" variant="outline" onClick={() => handleEdit(user)} className="hover:bg-blue-100">
                      <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDeleteUser(user.id)} className="hover:bg-red-100 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {users.length === 0 && !isFormVisible && (
              <p className="text-center text-gray-500 py-8">
                Nenhum usuário cadastrado ainda.
              </p>
            )}
          </div>
        </div>
      );
    };

    export default ManageUsersPage;