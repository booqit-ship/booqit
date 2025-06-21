import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Merchant } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';

const SHOPS_PER_PAGE = 10;

// Helper function to check if merchant is new (within 10 days)
const isMerchantNew = (createdAt: string): boolean => {
  if (!createdAt) return false;
  
  const createdDate = new Date(createdAt);
  const now = new Date();
  const tenDaysAgo = new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000));
  
  // Check if the date is valid and within the last 10 days
  return !isNaN(createdDate.getTime()) && createdDate > tenDaysAgo;
};

const NearbyShopsPage: React.FC = () => {
  const [nearbyShops, setNearbyShops] = useState<Merchant[]>([]);
  const [filteredShops, setFilteredShops] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Get category from URL params
  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      setActiveCategory(category);
    }
  }, [searchParams]);

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userLoc);
          fetchNearbyShops(userLoc);
        },
        (error) => {
          console.error("Error getting location:", error);
          // Use a default location (Bengaluru)
          const defaultLocation = { lat: 12.9716, lng: 77.5946 };
          setUserLocation(defaultLocation);
          fetchNearbyShops(defaultLocation);
        }
      );
    } else {
      const defaultLocation = { lat: 12.9716, lng: 77.5946 };
      setUserLocation(defaultLocation);
      fetchNearbyShops(defaultLocation);
    }
  }, []);

  // Filter shops whenever active category changes
  useEffect(() => {
    if (activeCategory) {
      let dbCategory = activeCategory;
      if (activeCategory === "Salon") {
        dbCategory = "barber_shop";
      } else if (activeCategory === "Beauty Parlour") {
        dbCategory = "beauty_parlour";
      }
      
      const filtered = nearbyShops.filter(shop => 
        shop.category.toLowerCase() === dbCategory.toLowerCase()
      );
      setFilteredShops(filtered);
    } else {
      setFilteredShops(nearbyShops);
    }
    setCurrentPage(1); // Reset to first page when filter changes
  }, [activeCategory, nearbyShops]);

  const fetchNearbyShops = async (location: { lat: number; lng: number }) => {
    setIsLoading(true);
    try {
      const { data: merchants, error } = await supabase
        .from('merchants')
        .select('*')
        .order('rating', { ascending: false });
        
      if (error) throw error;
      
      if (merchants && merchants.length > 0) {
        // Calculate distance for each merchant
        const shopsWithDistance = merchants.map(merchant => {
          const distance = calculateDistance(
            location.lat, 
            location.lng, 
            merchant.lat, 
            merchant.lng
          );
          return {
            ...merchant,
            distance: `${distance.toFixed(1)} km`,
            distanceValue: distance
          } as Merchant;
        });

        // Filter shops within 5km and sort by distance
        const nearbyFilteredShops = shopsWithDistance
          .filter(shop => (shop.distanceValue || 0) <= 5)
          .sort((a, b) => (a.distanceValue || 0) - (b.distanceValue || 0));
          
        setNearbyShops(nearbyFilteredShops);
        setFilteredShops(nearbyFilteredShops);
      }
    } catch (error) {
      console.error("Error fetching merchants:", error);
      toast({
        title: "Error",
        description: "Failed to load nearby shops. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const getShopImage = (merchant: Merchant) => {
    if (merchant.image_url && merchant.image_url.trim() !== '') {
      if (merchant.image_url.startsWith('http')) {
        return merchant.image_url;
      }
      return `https://ggclvurfcykbwmhfftkn.supabase.co/storage/v1/object/public/merchant_images/${merchant.image_url}`;
    }
    return 'https://images.unsplash.com/photo-1582562124811-c09040d0a901';
  };

  const handleBookNow = (merchantId: string) => {
    navigate(`/merchant/${merchantId}`);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredShops.length / SHOPS_PER_PAGE);
  const startIndex = (currentPage - 1) * SHOPS_PER_PAGE;
  const endIndex = startIndex + SHOPS_PER_PAGE;
  const currentShops = filteredShops.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center p-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">
              {activeCategory ? `${activeCategory} Near You` : "Nearby Shops"}
            </h1>
            <p className="text-sm text-gray-500">
              {filteredShops.length} shops within 5km
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
          </div>
        ) : currentShops.length > 0 ? (
          <>
            <motion.div 
              className="space-y-4 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {currentShops.map((shop) => (
                <motion.div
                  key={shop.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                >
                  <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex">
                        <div className="w-24 h-24 bg-gray-200 flex-shrink-0 relative">
                          <img 
                            src={getShopImage(shop)} 
                            alt={shop.shop_name} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://images.unsplash.com/photo-1582562124811-c09040d0a901';
                            }} 
                          />
                          {/* New Badge - Only show if merchant is truly new (within 10 days) */}
                          {isMerchantNew(shop.created_at) && (
                            <div className="absolute top-1 right-1 bg-green-500 text-white px-1.5 py-0.5 rounded-full text-xs font-medium">
                              New
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex-1">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium text-base line-clamp-1">
                              {shop.shop_name}
                            </h3>
                            <span className="text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center whitespace-nowrap">
                              ★ {shop.rating?.toFixed(1) || 'New'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-1">{shop.category}</p>
                          <p className="text-xs text-gray-400 line-clamp-2 mt-1">{shop.address}</p>
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
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shops found</h3>
              <p className="text-gray-500 mb-4">
                {activeCategory 
                  ? `No ${activeCategory} shops found within 5km of your location.`
                  : "No shops found within 5km of your location."
                }
              </p>
              <Button variant="outline" onClick={() => navigate('/map')}>
                Browse on Map
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyShopsPage;
