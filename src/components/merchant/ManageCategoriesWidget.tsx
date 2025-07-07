
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, X, Loader2, Tag } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface ManageCategoriesWidgetProps {
  merchantId: string;
  isOpen: boolean;
  onClose: () => void;
  onCategoriesUpdated: () => void;
}

const ManageCategoriesWidget: React.FC<ManageCategoriesWidgetProps> = ({
  merchantId,
  isOpen,
  onClose,
  onCategoriesUpdated
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#7E57C2');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && merchantId) {
      fetchCategories();
    }
  }, [isOpen, merchantId]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('service_categories')
        .insert({
          merchant_id: merchantId,
          name: newCategoryName.trim(),
          color: newCategoryColor
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category added successfully"
      });

      setNewCategoryName('');
      setNewCategoryColor('#7E57C2');
      setIsAddingCategory(false);
      fetchCategories();
      onCategoriesUpdated();
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Error",
        description: "Failed to add category"
      });
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return;

    try {
      const { error } = await supabase
        .from('service_categories')
        .update({
          name: newCategoryName.trim(),
          color: newCategoryColor
        })
        .eq('id', editingCategory.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category updated successfully"
      });

      setEditingCategory(null);
      setNewCategoryName('');
      setNewCategoryColor('#7E57C2');
      fetchCategories();
      onCategoriesUpdated();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category"
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('service_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category deleted successfully"
      });

      fetchCategories();
      onCategoriesUpdated();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category"
      });
    }
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryColor(category.color);
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryColor('#7E57C2');
    setIsAddingCategory(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw] mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-booqit-primary" />
            Manage Categories
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Category */}
          {(isAddingCategory || editingCategory) && (
            <Card className="border-booqit-primary/20">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="categoryName">Category Name</Label>
                    <Input
                      id="categoryName"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Hair Care, Skin Care"
                      className="border-booqit-primary/20 focus:border-booqit-primary"
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoryColor">Category Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="categoryColor"
                        type="color"
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor(e.target.value)}
                        className="w-16 h-10 border-booqit-primary/20"
                      />
                      <Input
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor(e.target.value)}
                        placeholder="#7E57C2"
                        className="flex-1 border-booqit-primary/20 focus:border-booqit-primary"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                      className="flex-1 bg-booqit-primary hover:bg-booqit-primary/90"
                    >
                      {editingCategory ? 'Update' : 'Add'} Category
                    </Button>
                    <Button
                      variant="outline"
                      onClick={cancelEdit}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Category Button */}
          {!isAddingCategory && !editingCategory && (
            <Button
              onClick={() => setIsAddingCategory(true)}
              className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Category
            </Button>
          )}

          {/* Categories List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-booqit-primary" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Tag className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No categories yet</p>
                <p className="text-sm">Add your first category to organize your services</p>
              </div>
            ) : (
              categories.map((category) => (
                <Card key={category.id} className="border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(category)}
                          className="h-8 w-8 hover:bg-booqit-primary/10 hover:text-booqit-primary"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(category.id)}
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageCategoriesWidget;
