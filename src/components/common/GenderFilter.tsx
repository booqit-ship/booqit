
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GenderFilterProps {
  selectedTypes: string[];
  onTypeToggle: (type: string) => void;
  onClear: () => void;
  isUnisexShop: boolean;
}

const GenderFilter: React.FC<GenderFilterProps> = ({
  selectedTypes,
  onTypeToggle,
  onClear,
  isUnisexShop
}) => {
  if (!isUnisexShop) return null;

  const genderTypes = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'unisex', label: 'Unisex' }
  ];

  return (
    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">Filter by Gender</h4>
        {selectedTypes.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {genderTypes.map((type) => (
          <Badge
            key={type.value}
            variant={selectedTypes.includes(type.value) ? "default" : "outline"}
            className={`cursor-pointer transition-colors ${
              selectedTypes.includes(type.value)
                ? 'bg-booqit-primary hover:bg-booqit-primary/90'
                : 'hover:bg-booqit-primary/10'
            }`}
            onClick={() => onTypeToggle(type.value)}
          >
            {type.label}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default GenderFilter;
