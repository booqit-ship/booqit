import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Bell,
  Search,
  SlidersHorizontal,
  Star,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

interface Category {
  id: string;
  name: string;
  image_url: string;
}

interface Merchant {
  id: string;
  shop_name: string;
  address: string;
  category: string;
  rating: number;
  image_url: string;
}

const categoriesData: Category[] = [
  { id: '1', name: 'Haircuts', image_url: '/images/categories/haircut.jpg' },
  { id: '2', name: 'Nail Art', image_url: '/images/categories/nailart.jpg' },
  { id: '3', name: 'Spa & Massage', image_url: '/images/categories/spa.jpg' },
  { id: '4', name: 'Barbers', image_url: '/images/categories/barber.jpg' },
];

const nearbyShopsData: Merchant[] = [
  {
    id: '101',
    shop_name: 'Salon de Paris',
    address: '123 Main St',
    category: 'Salon',
    rating: 4.5,
    image_url: '/images/shops/salon1.jpg',
  },
  {
    id: '102',
    shop_name: 'Nail Studio',
    address: '456 Elm St',
    category: 'Nail Art',
    rating: 4.2,
    image_url: '/images/shops/nailstudio.jpg',
  },
  {
    id: '103',
    shop_name: 'The Barber Shop',
    address: '789 Oak St',
    category: 'Barber',
    rating: 4.8,
    image_url: '/images/shops/barbershop.jpg',
  },
];

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const navigate = useNavigate();

  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredShops, setFilteredShops] = useState(nearbyShopsData);

  useEffect(() => {
    if (searchTerm) {
      const filtered = nearbyShopsData.filter((shop) =>
        shop.shop_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredShops(filtered);
    } else {
      setFilteredShops(nearbyShopsData);
    }
  }, [searchTerm]);

  const handleServiceSelect = (service: string) => {
    setSelectedService(service);
  };

  const handleBookNow = (shopId: string) => {
    navigate(`/shop/${shopId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-booqit-primary rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                Hi {profileLoading ? 'there' : (profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there')}!
              </h1>
              <p className="text-sm text-gray-600">Find your perfect salon</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="p-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search for salons..."
            className="rounded-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        </div>
        <Button variant="ghost" size="icon" className="absolute right-3 top-3">
          <SlidersHorizontal className="h-5 w-5" />
        </Button>
      </div>

      {/* Categories */}
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-3">Popular Categories</h2>
        <div className="flex overflow-x-auto gap-4 pb-3">
          {categoriesData.map((category) => (
            <button
              key={category.id}
              className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg shadow-sm w-32 hover:bg-gray-50 transition-colors"
              onClick={() => handleServiceSelect(category.name)}
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={category.image_url} alt={category.name} className="rounded-lg" />
                <AvatarFallback>{category.name}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-700">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Nearby Shops */}
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-3">Nearby Salons</h2>
        <div className="space-y-3">
          {filteredShops.map((shop) => (
            <Card key={shop.id} className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                    <img
                      src={shop.image_url}
                      alt={shop.shop_name}
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs rounded-md px-2 py-1">
                      {shop.category}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{shop.shop_name}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>{shop.rating}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{shop.address}</span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => handleBookNow(shop.id)}
                    >
                      Book Now <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
