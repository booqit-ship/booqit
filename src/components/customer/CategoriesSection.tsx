
import React from 'react';
import { Button } from '@/components/ui/button';

const featuredCategories = [{
  id: 1,
  name: 'Salon',
  image: '/lovable-uploads/1d496057-4a0b-4339-89fb-5545663e72d2.png',
  color: '#7E57C2'
}, {
  id: 2,
  name: 'Beauty Parlour',
  image: '/lovable-uploads/97bda84f-4d96-439c-8e76-204958874286.png',
  color: '#FF6B6B'
}];

interface CategoriesSectionProps {
  activeCategory: string | null;
  onCategoryClick: (categoryName: string) => void;
}

const CategoriesSection: React.FC<CategoriesSectionProps> = ({
  activeCategory,
  onCategoryClick
}) => {
  return (
    <div>
      <h2 className="mb-4 font-normal text-xl">Categories</h2>
      <div className="grid grid-cols-2 gap-4">
        {featuredCategories.map(category => (
          <Button
            key={category.id}
            variant="outline"
            className={`h-16 flex items-center justify-between p-0 border transition-all duration-200 overflow-hidden
              ${activeCategory === category.name 
                ? 'border-booqit-primary bg-booqit-primary/10 shadow-md' 
                : 'border-gray-200 shadow-sm hover:shadow-md hover:border-booqit-primary'
              }`}
            style={{
              backgroundColor: activeCategory === category.name 
                ? `${category.color}20` 
                : `${category.color}10`
            }}
            onClick={() => onCategoryClick(category.name)}
          >
            <div className="flex-1 flex items-center justify-start p-2">
              {category.name === 'Beauty Parlour' ? (
                <div className="text-xs font-medium text-gray-800 leading-tight">
                  <div>Beauty</div>
                  <div>Parlour</div>
                </div>
              ) : (
                <span className="text-xs font-medium text-gray-800">{category.name}</span>
              )}
            </div>
            <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(CategoriesSection);
