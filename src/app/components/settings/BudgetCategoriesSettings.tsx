import React, { useState, useEffect } from 'react';
import { dataStore } from '../../data/store';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export function BudgetCategoriesSettings() {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const cats = await dataStore.getBudgetCategories();
    setCategories(cats);
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    const success = await dataStore.addBudgetCategory(newCategory.trim());
    if (success) {
      toast.success('Category added successfully');
      setNewCategory('');
      loadCategories();
    } else {
      toast.error('Category already exists');
    }
  };

  const handleRemoveCategory = async (category: string) => {
    if (confirm(`Are you sure you want to remove "${category}"? This will not affect existing budget items.`)) {
      const success = await dataStore.removeBudgetCategory(category);
      if (success) {
        toast.success('Category removed successfully');
        loadCategories();
      } else {
        toast.error('Failed to remove category');
      }
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingValue(categories[index]);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const saveEdit = async () => {
    if (!editingValue.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    if (editingIndex !== null) {
      const oldCategory = categories[editingIndex];
      const success = await dataStore.updateBudgetCategory(oldCategory, editingValue.trim());

      if (success) {
        toast.success('Category updated successfully');
        setEditingIndex(null);
        setEditingValue('');
        loadCategories();
      } else {
        toast.error('Category name already exists or update failed');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Budget Categories</h3>
        <p className="text-sm text-gray-500 mb-4">
          Manage the budget categories available throughout the system. These categories will be used in budgets, purchase orders, invoices, and payments.
        </p>
      </div>

      {/* Add New Category */}
      <div className="bg-gray-50 rounded-lg p-4">
        <Label className="mb-2">Add New Category</Label>
        <div className="flex gap-2">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Enter category name"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddCategory();
              }
            }}
          />
          <Button 
            onClick={handleAddCategory}
            className="bg-[#7A1516] hover:bg-[#5A1012]"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Categories List */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h4 className="font-semibold">Current Categories</h4>
        </div>
        <div className="divide-y">
          {categories.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No categories found. Add your first category above.
            </div>
          ) : (
            categories.map((category, index) => (
              <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-50">
                {editingIndex === index ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          saveEdit();
                        } else if (e.key === 'Escape') {
                          cancelEditing();
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={saveEdit}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEditing}
                      className="text-gray-600 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="font-medium">{category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditing(index)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveCategory(category)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Removing or editing categories will not affect existing budget items, purchase orders, or invoices that already use those categories. Only new items will use the updated category list.
        </p>
      </div>
    </div>
  );
}
