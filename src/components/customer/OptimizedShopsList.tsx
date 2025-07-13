
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Merchant } from '@/types';

interface OptimizedShopsListProps {
  shops: Merchant[];
  isLoading: boolean;
  activeCategory: string | null;
  onClearFilter: () => void;
}

const ShopCardSkeleton = () => (
  <Card className="overflow-hidden shadow-md">
    <CardContent className="p-0">
      <div className="flex">
        <Skeleton className="w-24 h-24 flex-shrink-0" />
        <div className="p-3 flex-1">
          <div className="flex justify-between items-start mb-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-3 w-1/2 mb-2" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const OptimizedShopsList: React.FC<OptimizedShopsListProps> = ({
  shops,
  isLoading,
  activeCategory,
  onClearFilter
}) => {
  const navigate = useNavigate();

  const getShopImage = (merchant: Merchant) => {
    if (merchant.image_url && merchant.image_url.trim() !== '') {
      // Handle full URLs
      if (merchant.image_url.startsWith('http')) {
        return merchant.image_url;
      }
      // Handle Supabase storage URLs - check if it's already a full storage URL
      if (merchant.image_url.includes('supabase.co/storage')) {
        return merchant.image_url;
      }
      // Handle relative paths for Supabase storage
      return `https://ggclvurfcykbwmhfftkn.supabase.co/storage/v1/object/public/merchant-images/${merchant.image_url}`;
    }
    return 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=300&h=300&fit=crop';
  };

  const handleBookNow = (merchantId: string) => {
    navigate(`/merchant/${merchantId}`);
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="mb-4 font-normal text-xl">Near You</h2>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <ShopCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="mb-4 font-normal text-xl">
        {activeCategory ? `${activeCategory} Near You` : "Near You"}
        {activeCategory && (
          <Button
            variant="link"
            className="ml-2 p-0 h-auto text-sm text-booqit-primary"
            onClick={onClearFilter}
          >
            (Clear filter)
          </Button>
        )}
      </h2>
      
      {shops.length > 0 ? (
        <div className="space-y-4">
          {shops.slice(0, 6).map(shop => (
            <Card key={shop.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="flex">
                  <div className="w-24 h-24 bg-gray-200 flex-shrink-0">
                    <img
                      src={getShopImage(shop)}
                      alt={shop.shop_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1582562124811-c09040d0a901';
                      }}
                    />
                  </div>
                  <div className="p-3 flex-1 py-[6px]">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-base line-clamp-1">{shop.shop_name}</h3>
                      <span className="text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center whitespace-nowrap">
                        ★ {shop.rating?.toFixed(1) || 'New'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-1">{shop.category}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500 flex items-center">
                        <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 13.5C13.933 13.5 15.5 11.933 15.5 10C15.5 8.067 13.933 6.5 12 6.5C10.067 6.5 8.5 8.067 8.5 10C8.5 11.933 10.067 13.5 12 13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12 21.5C17 17.5 22 14.0718 22 10C22 5.92819 17.5228 2.5 12 2.5C6.47715 2.5 2 5.92819 2 10C2 14.0718 7 17.5 12 21.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {shop.distance}
                      </span>
                      <Button
                        size="sm"
                        className="bg-booqit-primary hover:bg-booqit-primary/90 text-xs h-8"
                        onClick={() => handleBookNow(shop.id)}
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            {activeCategory ? `No ${activeCategory} shops found within 5km` : "No shops found within 5km"}
          </p>
          <Button variant="link" className="mt-2" onClick={() => navigate('/map')}>
            Browse on Map
          </Button>
        </div>
      )}
    </div>
  );
};

export default React.memo(OptimizedShopsList);
