
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Merchant } from '@/types';
import { SlidersHorizontal, ChevronUp, ChevronDown, Star, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBottomSheetProps {
  merchants: Merchant[];
  filters: {
    sortBy: string;
    priceRange: string;
    category: string;
    rating: string;
    genderFocus: string;
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
      rating: 'all',
      genderFocus: 'all'
    });
  };

  const formatPrice = (price: number) => {
    return `₹${price}`;
  };

  const formatDuration = (duration: number) => {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    if (hours > 0) {
      return minutes > 0 ? `${hours} hr, ${minutes} min` : `${hours} hr`;
    }
    return `${minutes} min`;
  };

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ease-out z-40",
      isExpanded ? "h-[80vh]" : "h-40"
    )}>
      {/* Handle bar and header */}
      <div 
        className="flex flex-col items-center pt-3 pb-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-4"></div>
        
        {/* Filter and Sort controls */}
        <div className="flex items-center justify-between w-full px-6 mb-3">
          <div className="flex gap-3 items-center overflow-x-auto scrollbar-hide">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowFilters(!showFilters);
              }}
              className="rounded-full flex-shrink-0 h-9 px-4 border-gray-300"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filter
            </Button>
            
            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger className="w-28 h-9 rounded-full text-sm flex-shrink-0 border-gray-300">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priceRange} onValueChange={(value) => handleFilterChange('priceRange', value)}>
              <SelectTrigger className="w-24 h-9 rounded-full text-sm flex-shrink-0 border-gray-300">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="low">₹0-500</SelectItem>
                <SelectItem value="medium">₹500-1000</SelectItem>
                <SelectItem value="high">₹1000+</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.genderFocus} onValueChange={(value) => handleFilterChange('genderFocus', value)}>
              <SelectTrigger className="w-24 h-9 rounded-full text-sm flex-shrink-0 border-gray-300">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="men">Men</SelectItem>
                <SelectItem value="women">Women</SelectItem>
                <SelectItem value="unisex">Unisex</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-shrink-0 ml-3">
            {isExpanded ? 
              <ChevronDown className="w-5 h-5 text-gray-400" /> : 
              <ChevronUp className="w-5 h-5 text-gray-400" />
            }
          </div>
        </div>
        
        {/* Venue count */}
        <div className="px-6 w-full">
          <p className="text-sm text-gray-500 text-left">
            {merchants.length} venues nearby
          </p>
        </div>
      </div>

      {/* Extended filters */}
      {showFilters && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-booqit-primary">
              Reset
            </Button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-3 block text-gray-700">Minimum Rating</label>
              <div className="flex gap-2 flex-wrap">
                {['all', '3', '4', '4.5'].map(rating => (
                  <Button
                    key={rating}
                    variant={filters.rating === rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange('rating', rating)}
                    className="rounded-full h-9"
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

      {/* Merchant list */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto px-6 pb-24">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-booqit-primary"></div>
            </div>
          ) : merchants.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No venues found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-6">
              {merchants.map(merchant => (
                <Card 
                  key={merchant.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-md rounded-2xl"
                  onClick={() => onMerchantSelect(merchant)}
                >
                  <div className="relative">
                    {/* Shop Image */}
                    <div className="w-full h-48 relative">
                      <img 
                        src={merchant.image_url || '/placeholder.svg'} 
                        alt={merchant.shop_name} 
                        className="w-full h-full object-cover rounded-t-2xl"
                      />
                      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 mr-1" />
                          <span className="text-sm font-semibold text-gray-800">
                            {merchant.rating ? merchant.rating.toFixed(1) : 'New'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      {/* Shop Name and Location */}
                      <div className="mb-3">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{merchant.shop_name}</h3>
                        <div className="flex items-center text-gray-600">
                          <Star className="w-4 h-4 text-yellow-400 mr-1" />
                          <span className="text-sm font-medium mr-2">
                            {merchant.rating ? merchant.rating.toFixed(1) : 'New'}
                          </span>
                          <span className="text-sm">•</span>
                          <span className="text-sm ml-2">{merchant.address.split(',')[0]}</span>
                        </div>
                      </div>

                      {/* Services */}
                      {merchant.services && merchant.services.length > 0 && (
                        <div className="space-y-3">
                          {merchant.services.slice(0, 3).map((service, index) => (
                            <div key={service.id} className="flex justify-between items-center">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 text-sm">{service.name}</h4>
                                <div className="flex items-center text-gray-500 text-xs mt-1">
                                  <Clock className="w-3 h-3 mr-1" />
                                  <span>{formatDuration(service.duration)}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold text-gray-900">from {formatPrice(service.price)}</span>
                              </div>
                            </div>
                          ))}
                          
                          {merchant.services.length > 3 && (
                            <div className="pt-2">
                              <span className="text-booqit-primary text-sm font-medium">
                                See more
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Distance */}
                      {merchant.distanceValue && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center text-gray-600">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span className="text-sm">{merchant.distance} away</span>
                          </div>
                        </div>
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
