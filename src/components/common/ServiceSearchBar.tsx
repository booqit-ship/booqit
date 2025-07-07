
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface ServiceSearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategories: string[];
  onCategoryToggle: (categoryId: string) => void;
  categories: Category[];
  placeholder?: string;
}

const ServiceSearchBar: React.FC<ServiceSearchBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategories,
  onCategoryToggle,
  categories,
  placeholder = "Search services..."
}) => {
  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 border-booqit-primary/20 focus:border-booqit-primary"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Categories Filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const isSelected = selectedCategories.includes(category.id);
            return (
              <Badge
                key={category.id}
                variant={isSelected ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-booqit-primary hover:bg-booqit-primary/90 text-white' 
                    : 'hover:bg-booqit-primary/10 hover:text-booqit-primary border-booqit-primary/30'
                }`}
                onClick={() => onCategoryToggle(category.id)}
              >
                <div
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: isSelected ? 'white' : category.color }}
                />
                {category.name}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ServiceSearchBar;
