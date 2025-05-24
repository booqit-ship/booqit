
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Merchant } from '@/types';
import { SlidersHorizontal, ChevronUp, ChevronDown, Star, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBottomSheetProps {
  merchants: Merchant[];
  filters: {
    sortBy: string;
    priceRange: string;
    category: string;
    rating: string;
  };
  onFiltersChange: (filters: any) => void;
  isLoading: boolean;
  onMerchantSelect: (merchant: Merchant) => void;
}

const SearchBottomSheet: React.FC<SearchBottomSheetProps> = ({
  merchants,
  filters,
  onFiltersChange,
  isLoading,
  onMerchantSelect
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    onFiltersChange({
      sortBy: 'distance',
      priceRange: 'all',
      category: 'all',
      rating: 'all'
    });
  };

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ease-out z-50 mb-16",
      isExpanded ? "h-[calc(70vh-4rem)]" : "h-32"
    )}>
      {/* Handle bar */}
      <div 
        className="flex flex-col items-center pt-3 pb-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-12 h-1 bg-gray-300 rounded-full mb-3"></div>
        
        {/* Filter and Sort buttons */}
        <div className="flex items-center justify-between w-full px-4 mb-2">
          <div className="flex gap-2 overflow-x-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowFilters(!showFilters);
              }}
              className="rounded-full flex-shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4 mr-1" />
              Filter
            </Button>
            
            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger className="w-20 h-8 rounded-full text-xs flex-shrink-0">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priceRange} onValueChange={(value) => handleFilterChange('priceRange', value)}>
              <SelectTrigger className="w-16 h-8 rounded-full text-xs flex-shrink-0">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="low">₹0-500</SelectItem>
                <SelectItem value="medium">₹500-1000</SelectItem>
                <SelectItem value="high">₹1000+</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger className="w-16 h-8 rounded-full text-xs flex-shrink-0">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="salon">Salon</SelectItem>
                <SelectItem value="spa">Spa</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="fitness">Fitness</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />}
        </div>
        
        {/* Venue count */}
        <p className="text-sm text-gray-500 px-4 w-full text-left">
          {merchants.length} venues nearby
        </p>
      </div>

      {/* Extended filters (when showFilters is true) */}
      {showFilters && (
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Filters</h3>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset
            </Button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Minimum Rating</label>
              <div className="flex gap-2 flex-wrap">
                {['all', '3', '4', '4.5'].map(rating => (
                  <Button
                    key={rating}
                    variant={filters.rating === rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange('rating', rating)}
                    className="rounded-full text-xs"
                  >
                    {rating === 'all' ? 'Any' : `${rating}+ ⭐`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
        </div>
      )}

      {/* Merchant list (when expanded) */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-booqit-primary"></div>
            </div>
          ) : merchants.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No venues found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {merchants.map(merchant => (
                <Card 
                  key={merchant.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onMerchantSelect(merchant)}
                >
                  <div className="flex h-20">
                    <div className="w-20 h-20 flex-shrink-0">
                      <img 
                        src={merchant.image_url || '/placeholder.svg'} 
                        alt={merchant.shop_name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="flex-1 p-3">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold text-sm line-clamp-1">{merchant.shop_name}</h3>
                        <div className="flex items-center flex-shrink-0 ml-2">
                          <Star className="w-3 h-3 text-yellow-400 mr-1" />
                          <span className="text-xs font-medium">{merchant.rating || 'New'}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-1 line-clamp-1">{merchant.address}</p>
                      <p className="text-xs text-gray-500 mb-1">{merchant.category}</p>
                      {merchant.distanceValue && (
                        <p className="text-xs text-booqit-primary font-medium">
                          {merchant.distance} away
                        </p>
                      )}
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBottomSheet;
