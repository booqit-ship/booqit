
import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronUp, Filter, MapPin, Clock, Star } from 'lucide-react';
import { Merchant } from '@/types';

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

const SearchBottomSheet: React.FC<SearchBottomSheetProps> = ({
  merchants,
  filters,
  onFiltersChange,
  isLoading,
  onMerchantSelect,
  userCity
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getShopImage = (merchant: Merchant) => {
    if (merchant.image_url && merchant.image_url.trim() !== '') {
      if (merchant.image_url.startsWith('http')) {
        return merchant.image_url;
      }
      return `https://ggclvurfcykbwmhfftkn.supabase.co/storage/v1/object/public/merchant_images/${merchant.image_url}`;
    }
    return 'https://images.unsplash.com/photo-1582562124811-c09040d0a901';
  };

  const getMinPrice = (merchant: Merchant) => {
    if (!merchant.services || merchant.services.length === 0) return null;
    const minPrice = Math.min(...merchant.services.map(s => s.price));
    return minPrice;
  };

  const ShopCardSkeleton = () => (
    <Card className="mb-4">
      <CardContent className="p-0">
        <div className="flex">
          <Skeleton className="w-24 h-24 flex-shrink-0 rounded-l-lg" />
          <div className="p-4 flex-1">
            <div className="flex justify-between items-start mb-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-1/2 mb-2" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24 rounded" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40">
          <Button
            variant="outline"
            className="bg-white/95 backdrop-blur-sm shadow-lg border-0 px-6 py-3 rounded-full font-medium"
          >
            <ChevronUp className="h-4 w-4 mr-2" />
            {isLoading ? 'Loading...' : `${merchants.length} ${userCity ? `in ${userCity}` : 'salons found'}`}
          </Button>
        </div>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[85vh] p-0">
        <div className="flex flex-col h-full">
          {/* Header with drag indicator */}
          <div className="flex-shrink-0 p-4 border-b bg-white">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {merchants.length} {userCity ? `salons in ${userCity}` : 'salons found'}
              </h2>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>
            
            {/* Filter Controls */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              <Select
                value={filters.sortBy}
                onValueChange={(value) => onFiltersChange({ ...filters, sortBy: value })}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="distance">Distance</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.priceRange}
                onValueChange={(value) => onFiltersChange({ ...filters, priceRange: value })}
              >
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="low">₹0-500</SelectItem>
                  <SelectItem value="medium">₹500-1000</SelectItem>
                  <SelectItem value="high">₹1000+</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.category}
                onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
              >
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="barber_shop">Salon</SelectItem>
                  <SelectItem value="beauty_parlour">Beauty Parlour</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.rating}
                onValueChange={(value) => onFiltersChange({ ...filters, rating: value })}
              >
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="4">4+ ★</SelectItem>
                  <SelectItem value="3">3+ ★</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.genderFocus}
                onValueChange={(value) => onFiltersChange({ ...filters, genderFocus: value })}
              >
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="unisex">Unisex</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <ShopCardSkeleton key={index} />
                ))}
              </div>
            ) : merchants.length > 0 ? (
              <div className="space-y-4">
                {merchants.map((merchant) => {
                  const minPrice = getMinPrice(merchant);
                  return (
                    <Card
                      key={merchant.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => onMerchantSelect(merchant)}
                    >
                      <CardContent className="p-0">
                        <div className="flex">
                          <div className="w-24 h-24 bg-gray-200 flex-shrink-0">
                            <img
                              src={getShopImage(merchant)}
                              alt={merchant.shop_name}
                              className="w-full h-full object-cover rounded-l-lg"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://images.unsplash.com/photo-1582562124811-c09040d0a901';
                              }}
                            />
                          </div>
                          <div className="p-4 flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-medium text-base line-clamp-1">{merchant.shop_name}</h3>
                              {merchant.rating && (
                                <div className="flex items-center bg-green-100 px-2 py-1 rounded-full">
                                  <Star className="w-3 h-3 text-green-600 fill-current mr-1" />
                                  <span className="text-xs font-medium text-green-800">
                                    {merchant.rating.toFixed(1)} ({merchant.reviewCount || 0})
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{merchant.category}</p>
                            <div className="flex items-center text-xs text-gray-500 mb-2">
                              <MapPin className="w-3 h-3 mr-1" />
                              <span className="line-clamp-1">{merchant.address}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                {merchant.distance && (
                                  <span className="text-xs text-gray-500">{merchant.distance}</span>
                                )}
                                {minPrice && (
                                  <Badge variant="outline" className="text-xs">
                                    from ₹{minPrice}
                                  </Badge>
                                )}
                              </div>
                              <Button size="sm" className="bg-booqit-primary hover:bg-booqit-primary/90 text-xs h-8">
                                Book Now
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <MapPin className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">No salons found</h3>
                <p className="text-gray-500">Try adjusting your filters or search in a different area</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SearchBottomSheet;
