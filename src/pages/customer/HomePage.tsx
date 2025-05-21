
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Mock data for featured categories
const featuredCategories = [
  { id: 1, name: 'Haircuts', icon: '💇', color: '#7E57C2' },
  { id: 2, name: 'Spas', icon: '💆', color: '#4ECDC4' },
  { id: 3, name: 'Yoga', icon: '🧘', color: '#FF6B6B' },
  { id: 4, name: 'Dental', icon: '🦷', color: '#FFD166' },
  { id: 5, name: 'Fitness', icon: '💪', color: '#3D405B' },
  { id: 6, name: 'More', icon: '•••', color: '#343A40' },
];

// Mock data for nearby shops
const nearbyShops = [
  {
    id: 1,
    name: 'Trendy Cuts',
    category: 'Haircuts',
    rating: 4.8,
    distance: '1.2 km',
    image: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901',
  },
  {
    id: 2,
    name: 'Zen Spa',
    category: 'Spas',
    rating: 4.7,
    distance: '0.8 km',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
  },
  {
    id: 3,
    name: 'Yoga Life',
    category: 'Yoga',
    rating: 4.9,
    distance: '1.5 km',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
  },
];

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get user's current location name (this would come from geolocation + reverse geocoding)
  const locationName = "Bengaluru";
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <div className="pb-20"> {/* Add padding to account for bottom navigation */}
      <motion.div 
        className="bg-gradient-to-r from-booqit-primary to-purple-700 text-white p-6 rounded-b-3xl shadow-lg"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Hi there! 👋</h1>
            <p className="opacity-90 flex items-center">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 13.5C13.933 13.5 15.5 11.933 15.5 10C15.5 8.067 13.933 6.5 12 6.5C10.067 6.5 8.5 8.067 8.5 10C8.5 11.933 10.067 13.5 12 13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 21.5C17 17.5 22 14.0718 22 10C22 5.92819 17.5228 2.5 12 2.5C6.47715 2.5 2 5.92819 2 10C2 14.0718 7 17.5 12 21.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {locationName}
            </p>
          </div>
          <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center">
            <span className="text-booqit-primary font-medium">A</span>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-booqit-primary" />
          <Input
            placeholder="Search services, shops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white text-gray-800 border-0 shadow-md focus:ring-2 focus:ring-white"
          />
        </div>
      </motion.div>

      <div className="p-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <h2 className="text-xl font-semibold mb-4">Categories</h2>
            <div className="grid grid-cols-3 gap-4">
              {featuredCategories.map((category) => (
                <Button
                  key={category.id}
                  variant="outline"
                  className="h-auto flex flex-col items-center justify-center p-4 border border-gray-200 shadow-sm hover:shadow-md hover:border-booqit-primary transition-all"
                  style={{ backgroundColor: `${category.color}10` }}
                >
                  <span className="text-2xl mb-2" style={{ color: category.color }}>
                    {category.icon}
                  </span>
                  <span className="text-sm font-medium">{category.name}</span>
                </Button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Near You</h2>
            <div className="space-y-4">
              {nearbyShops.map((shop) => (
                <Card key={shop.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex">
                      <div className="w-24 h-24 bg-gray-200 relative">
                        <img 
                          src={shop.image} 
                          alt={shop.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3 flex-1">
                        <div className="flex justify-between">
                          <h3 className="font-medium text-base">{shop.name}</h3>
                          <span className="text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center">
                            ★ {shop.rating}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{shop.category}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500 flex items-center">
                            <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 13.5C13.933 13.5 15.5 11.933 15.5 10C15.5 8.067 13.933 6.5 12 6.5C10.067 6.5 8.5 8.067 8.5 10C8.5 11.933 10.067 13.5 12 13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M12 21.5C17 17.5 22 14.0718 22 10C22 5.92819 17.5228 2.5 12 2.5C6.47715 2.5 2 5.92819 2 10C2 14.0718 7 17.5 12 21.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            {shop.distance}
                          </span>
                          <Button size="sm" className="bg-booqit-primary hover:bg-booqit-primary/90 text-xs h-8">
                            Book Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Explore Map</h2>
            <Card className="overflow-hidden shadow-md bg-gray-100 h-48 flex items-center justify-center">
              <p className="text-gray-500">Map view coming soon!</p>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
