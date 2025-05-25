
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange(prev => ({ ...prev, [key]: value }));
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
      "fixed bottom-16 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ease-out z-40",
      isExpanded ? "h-[calc(100vh-4rem-4rem)]" : "h-44"
    )}>
      {/* Handle bar and header */}
      <div className="sticky top-0 bg-white rounded-t-3xl z-50">
        <div 
          className="flex flex-col items-center pt-3 pb-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-4"></div>
          
          {/* Fixed Filter controls - properly aligned */}
          <div className="w-full px-4 mb-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-9 px-3 border-gray-300 flex-shrink-0 text-sm"
              >
                <SlidersHorizontal className="w-4 h-4 mr-1" />
                Filter
              </Button>
              
              <div className="flex gap-2 flex-1 min-w-0">
                <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                  <SelectTrigger className="w-20 h-9 rounded-full text-xs border-gray-300 bg-white flex-shrink-0">
                    <SelectValue placeholder="Distance" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg z-50">
                    <SelectItem value="distance">Distance</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.rating} onValueChange={(value) => handleFilterChange('rating', value)}>
                  <SelectTrigger className="w-16 h-9 rounded-full text-xs border-gray-300 bg-white flex-shrink-0">
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg z-50">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="3">3+ ⭐</SelectItem>
                    <SelectItem value="4">4+ ⭐</SelectItem>
                    <SelectItem value="4.5">4.5+ ⭐</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.genderFocus} onValueChange={(value) => handleFilterChange('genderFocus', value)}>
                  <SelectTrigger className="w-16 h-9 rounded-full text-xs border-gray-300 bg-white flex-shrink-0">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg z-50">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="men">Men</SelectItem>
                    <SelectItem value="women">Women</SelectItem>
                    <SelectItem value="unisex">Unisex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-shrink-0">
                {isExpanded ? 
                  <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                }
              </div>
            </div>
          </div>
          
          {/* Shop count */}
          <div className="px-6 w-full">
            <p className="text-sm text-gray-500 text-left">
              {merchants.length} beauty spots found nearby
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable merchant list */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-booqit-primary"></div>
            </div>
          ) : merchants.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No beauty spots found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
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
                                +{merchant.services.length - 3} more services
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
