import React, { useState, useEffect, useCallback } from 'react';
    import { motion } from 'framer-motion';
    import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { useToast } from '@/components/ui/use-toast';

    const CategoryManager = () => {
      const { toast } = useToast();
      const [categories, setCategories] = useState([]);
      const [isFormVisible, setIsFormVisible] = useState(false);
      const [editingCategory, setEditingCategory] = useState(null);
      const [categoryName, setCategoryName] = useState('');

      const loadCategories = useCallback(() => {
        const stored = JSON.parse(localStorage.getItem('categories') || '[]');
        setCategories(stored);
      }, []);

      useEffect(() => {
        loadCategories();
      }, [loadCategories]);

      const saveCategories = (updatedCategories) => {
        localStorage.setItem('categories', JSON.stringify(updatedCategories));
        setCategories(updatedCategories);
        loadCategories();
      };

      const resetForm = () => {
        setIsFormVisible(false);
        setEditingCategory(null);
        setCategoryName('');
      };

      const handleAddNew = () => {
        resetForm();
        setIsFormVisible(true);
      };

      const handleEdit = (category) => {
        setEditingCategory(category);
        setCategoryName(category.name);
        setIsFormVisible(true);
        window.scrollTo(0, 0);
      };

      const handleSubmit = () => {
        if (!categoryName.trim()) {
          toast({
            title: "Erro",
            description: "O nome do tópico não pode ser vazio.",
            variant: "destructive",
          });
          return;
        }

        let updatedCategories;
        if (editingCategory) {
          updatedCategories = categories.map(cat =>
            cat.id === editingCategory.id ? { ...cat, name: categoryName.trim() } : cat
          );
        } else {
          const newCategory = {
            id: `cat_${Date.now()}`,
            name: categoryName.trim(),
            value: categoryName.trim().toLowerCase().replace(/\s+/g, '-'),
          };
          updatedCategories = [...categories, newCategory];
        }

        saveCategories(updatedCategories);
        toast({
          title: "Sucesso!",
          description: editingCategory ? "Tópico atualizado!" : "Tópico criado!",
        });
        resetForm();
      };

      const handleDelete = (categoryId) => {
        const updatedCategories = categories.filter(cat => cat.id !== categoryId);
        saveCategories(updatedCategories);
        toast({
          title: "Tópico removido",
          description: "O tópico foi removido com sucesso.",
        });
      };

      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
              Tópicos ({categories.length})
            </h2>
            <Button
              onClick={handleAddNew}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Novo Tópico
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
                  {editingCategory ? 'Editar Tópico' : 'Novo Tópico'}
                </h2>
                <Button variant="outline" onClick={resetForm}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700 font-semibold mb-2 block">
                    Nome do Tópico
                  </Label>
                  <Input
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Ex: Direito Civil, Direito Penal..."
                    className="h-12 rounded-xl border-2"
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  className="w-full h-12 text-lg rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {editingCategory ? 'Atualizar Tópico' : 'Salvar Tópico'}
                </Button>
              </div>
            </motion.div>
          )}

          <div className="space-y-4">
            {categories.map((cat) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 border border-white/20 flex justify-between items-center"
              >
                <span className="font-medium text-gray-700">{cat.name}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(cat)}
                    className="hover:bg-blue-100"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(cat.id)}
                    className="hover:bg-red-100 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
            {categories.length === 0 && !isFormVisible && (
              <div className="text-center py-12 text-gray-500">
                Nenhum tópico cadastrado ainda.
              </div>
            )}
          </div>
        </div>
      );
    };

    export default CategoryManager;