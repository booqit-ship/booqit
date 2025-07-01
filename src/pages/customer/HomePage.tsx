
import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import UpcomingBookings from '@/components/customer/UpcomingBookings';
import { useOptimizedUserProfile } from '@/hooks/useOptimizedUserProfile';

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

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationName, setLocationName] = useState("Your area");
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { userName, userAvatar } = useOptimizedUserProfile();

  // Simple location detection - cached and lightweight
  useEffect(() => {
    const cachedLocation = sessionStorage.getItem('user_location_name');
    if (cachedLocation) {
      setLocationName(cachedLocation);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          const name = "Bengaluru"; // Simple fallback
          setLocationName(name);
          sessionStorage.setItem('user_location_name', name);
        },
        () => {
          setLocationName("Bengaluru");
          sessionStorage.setItem('user_location_name', "Bengaluru");
        }
      );
    }
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/search');
    }
  };

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/search?category=${encodeURIComponent(categoryName)}`);
  };

  const handleProfileClick = () => {
    navigate('/settings/account');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="pb-20 min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-booqit-primary to-purple-700 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-light">Hi {userName}! 👋</h1>
            <p className="opacity-90 flex items-center">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 13.5C13.933 13.5 15.5 11.933 15.5 10C15.5 8.067 13.933 6.5 12 6.5C10.067 6.5 8.5 8.067 8.5 10C8.5 11.933 10.067 13.5 12 13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 21.5C17 17.5 22 14.0718 22 10C22 5.92819 17.5228 2.5 12 2.5C6.47715 2.5 2 5.92819 2 10C2 14.0718 7 17.5 12 21.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {locationName}
            </p>
          </div>
          <Avatar className="h-10 w-10 bg-white cursor-pointer" onClick={handleProfileClick}>
            {userAvatar ? (
              <AvatarImage src={userAvatar} alt={userName} className="object-cover" />
            ) : (
              <AvatarFallback className="text-booqit-primary font-medium">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-booqit-primary" />
          <Input
            placeholder="Search services, shops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 bg-white text-gray-800 border-0 shadow-md focus:ring-2 focus:ring-white"
          />
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Upcoming Bookings Section */}
        <UpcomingBookings />

        {/* Categories Section */}
        <div>
          <h2 className="mb-4 font-normal text-xl">Categories</h2>
          <div className="grid grid-cols-2 gap-4">
            {featuredCategories.map(category => (
              <button
                key={category.id}
                className="h-16 flex items-center justify-between p-0 border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-booqit-primary transition-all duration-200 overflow-hidden bg-white"
                onClick={() => handleCategoryClick(category.name)}
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
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="mb-4 font-normal text-xl">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/search')}
              className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="text-center">
                <Search className="h-6 w-6 mx-auto mb-2 text-booqit-primary" />
                <span className="text-sm font-medium text-gray-800">Find Services</span>
              </div>
            </button>
            <button
              onClick={() => navigate('/map')}
              className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="text-center">
                <svg className="h-6 w-6 mx-auto mb-2 text-booqit-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-800">Near Me</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
