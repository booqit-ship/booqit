import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Merchant } from '@/types';
import { SlidersHorizontal, ChevronUp, ChevronDown, Star, MapPin, Clock, Search } from 'lucide-react';
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
  userCity: string;
}

const StarRating: React.FC<{ rating: number | null }> = ({ rating }) => {
  const stars = [];
  const actualRating = rating || 0;
  
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= actualRating;
    const isHalfFilled = i - 0.5 <= actualRating && i > actualRating;
    
    stars.push(
      <Star
        key={i}
        className={cn(
          "w-3 h-3",
          isFilled || isHalfFilled
            ? "fill-yellow-400 text-yellow-400"
            : "fill-gray-200 text-gray-200"
        )}
      />
    );
  }
  
  return (
    <div className="flex items-center gap-1">
      <div className="flex">{stars}</div>
      {rating && rating > 0 && (
        <span className="text-xs text-gray-600 ml-1 font-poppins">
          ({rating.toFixed(1)})
        </span>
      )}
    </div>
  );
};

const SearchBottomSheet: React.FC<SearchBottomSheetProps> = ({
  merchants,
  filters,
  onFiltersChange,
  isLoading,
  onMerchantSelect,
  userCity
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    console.log(`Filter changed: ${key} = ${value}`);
    onFiltersChange(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    console.log('Resetting all filters');
    onFiltersChange({
      sortBy: 'rating',
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

  const handleExpandToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return <div className={cn("fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ease-out z-40 flex flex-col", isExpanded ? "h-[85vh]" : "h-44")}>
      {/* Handle bar and header */}
      <div className="flex flex-col items-center pt-3 pb-4 flex-shrink-0">
        {/* Only the handle bar should be clickable for expanding */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-4 cursor-pointer" onClick={handleExpandToggle}></div>
        
        {/* Filter and Sort controls - Fixed, no scrolling */}
        <div className="flex items-center justify-between w-full px-4 mb-3">
          <div className="flex gap-3 items-center w-full">
            {/* Filter Button */}
            <Button variant="outline" size="sm" onClick={e => {
            e.stopPropagation();
            setShowFilters(!showFilters);
          }} className="rounded-full flex-shrink-0 h-9 px-3 border-gray-300 text-sm font-poppins">
              <SlidersHorizontal className="w-4 h-4 mr-1" />
              Filter
            </Button>
            
            {/* Category Filter */}
            <Select value={filters.category} onValueChange={value => handleFilterChange('category', value)}>
              <SelectTrigger className="flex-1 h-9 rounded-full text-sm border-gray-300 font-poppins" onClick={e => e.stopPropagation()}>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all" className="font-poppins">All</SelectItem>
                <SelectItem value="barber_shop" className="font-poppins">Salon</SelectItem>
                <SelectItem value="beauty_parlour" className="font-poppins">Beauty</SelectItem>
              </SelectContent>
            </Select>

            {/* Type (Gender Focus) */}
            <Select value={filters.genderFocus} onValueChange={value => handleFilterChange('genderFocus', value)}>
              <SelectTrigger className="flex-1 h-9 rounded-full text-sm border-gray-300 font-poppins" onClick={e => e.stopPropagation()}>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all" className="font-poppins">All</SelectItem>
                <SelectItem value="men" className="font-poppins">Men</SelectItem>
                <SelectItem value="women" className="font-poppins">Women</SelectItem>
                <SelectItem value="unisex" className="font-poppins">Unisex</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Expand/Collapse Icon - Only this should control expansion */}
          <div className="flex-shrink-0 ml-2">
            <Button variant="ghost" size="sm" onClick={handleExpandToggle} className="p-1 h-auto">
              {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
            </Button>
          </div>
        </div>
        
        {/* Venue count */}
        <div className="px-4 w-full">
          <p className="text-sm text-gray-500 text-left font-poppins">
            {merchants.length} salons found {userCity && `in ${userCity}`}
          </p>
        </div>
      </div>

      {/* Extended filters */}
      {showFilters && <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 font-righteous font-medium">More Filters</h3>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-booqit-primary font-poppins">
              Reset
            </Button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-3 block text-gray-700 font-poppins">Price Range</label>
              <div className="flex gap-2 flex-wrap">
                {[{
              value: 'all',
              label: 'Any'
            }, {
              value: 'low',
              label: '₹0-500'
            }, {
              value: 'medium',
              label: '₹500-1000'
            }, {
              value: 'high',
              label: '₹1000+'
            }].map(price => <Button key={price.value} variant={filters.priceRange === price.value ? "default" : "outline"} size="sm" onClick={() => handleFilterChange('priceRange', price.value)} className="rounded-full h-9 font-poppins">
                    {price.label}
                  </Button>)}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-3 block text-gray-700 font-poppins">Minimum Rating</label>
              <div className="flex gap-2 flex-wrap">
                {['all', '3', '4', '4.5'].map(rating => <Button key={rating} variant={filters.rating === rating ? "default" : "outline"} size="sm" onClick={() => handleFilterChange('rating', rating)} className="rounded-full h-9 font-poppins">
                    {rating === 'all' ? 'Any' : `${rating}+ ⭐`}
                  </Button>)}
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
        </div>}

      {/* Merchant list - Scrollable */}
      {isExpanded && <div className="flex-1 overflow-y-auto px-4 pb-20">
          {isLoading ? <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-booqit-primary"></div>
            </div> : merchants.length === 0 ? <div className="flex flex-col items-center justify-center py-16 px-8">
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <Search className="w-10 h-10 text-blue-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-pink-100 to-orange-100 rounded-full flex items-center justify-center">
                  <Star className="w-4 h-4 text-pink-400" />
                </div>
                <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-br from-green-100 to-teal-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-3 h-3 text-green-400" />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2 font-righteous font-medium">No salons found</h3>
              <p className="text-gray-500 text-center text-sm leading-relaxed font-poppins">
                We couldn't find any salons matching your criteria {userCity && `in ${userCity}`}.
                <br />
                Try adjusting your filters or search in a different area.
              </p>
            </div> : <div className="space-y-6">
              {merchants.map(merchant => <Card key={merchant.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-md rounded-2xl" onClick={() => onMerchantSelect(merchant)}>
                  <div className="relative">
                    {/* Shop Image */}
                    <div className="w-full h-48 relative">
                      <img src={merchant.image_url || '/placeholder.svg'} alt={merchant.shop_name} className="w-full h-full object-cover rounded-t-2xl" />
                      
                    </div>
                    
                    <CardContent className="p-4">
                      {/* Shop Name and Star Rating */}
                      <div className="mb-3">
                        <h3 className="font-bold text-gray-900 mb-1 font-righteous font-medium text-xl">
                          {merchant.shop_name}
                        </h3>
                        
                        {/* Star Rating Display */}
                        <StarRating rating={merchant.rating} />
                      </div>

                      {/* Services */}
                      {merchant.services && merchant.services.length > 0 && <div className="space-y-3">
                          {merchant.services.slice(0, 3).map((service, index) => <div key={service.id} className="flex justify-between items-center">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 font-poppins text-base">{service.name}</h4>
                                <div className="flex items-center text-gray-500 text-xs mt-1">
                                  <Clock className="w-3 h-3 mr-1" />
                                  <span className="font-poppins">{formatDuration(service.duration)}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-900 font-poppins font-semibold">
                                  from {formatPrice(service.price)}
                                </span>
                              </div>
                            </div>)}
                          
                          {merchant.services.length > 3 && <div className="pt-2">
                              <span className="text-booqit-primary text-sm font-medium font-poppins">
                                See more
                              </span>
                            </div>}
                        </div>}

                      {/* Distance */}
                      {merchant.distanceValue && <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center text-gray-600">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span className="text-sm font-poppins">{merchant.distance} away</span>
                          </div>
                        </div>}
                    </CardContent>
                  </div>
                </Card>)}
            </div>}
        </div>}
    </div>;
};

export default SearchBottomSheet;
