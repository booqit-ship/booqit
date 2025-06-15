import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Merchant } from '@/types';
import { Search, MapPin } from 'lucide-react';
import GoogleMapComponent from '@/components/common/GoogleMap';
import SearchBottomSheet from '@/components/customer/SearchBottomSheet';
import MerchantMapPopup from '@/components/customer/MerchantMapPopup';

const SearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allMerchants, setAllMerchants] = useState<Merchant[]>([]);
  const [cityFilteredMerchants, setCityFilteredMerchants] = useState<Merchant[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<Merchant[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userCity, setUserCity] = useState<string>('');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 });
  const [mapZoom, setMapZoom] = useState(11);
  const [filters, setFilters] = useState({
    sortBy: 'rating',
    priceRange: 'all',
    category: 'all',
    rating: 'all',
    genderFocus: 'all'
  });
  const [mapPopupMerchant, setMapPopupMerchant] = useState<Merchant | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Get user location and fetch merchants
  useEffect(() => {
    const initializeSearch = async () => {
      // Get user's current location with high accuracy
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserLocation(newLocation);
            setMapCenter(newLocation);
            setMapZoom(14);
            
            // Get user's city using reverse geocoding
            await getUserCity(newLocation.lat, newLocation.lng);
          },
          (error) => {
            console.error('Error getting location:', error);
            // Default to Bangalore if location access is denied
            const defaultLocation = { lat: 12.9716, lng: 77.5946 };
            setUserLocation(defaultLocation);
            setMapCenter(defaultLocation);
            setUserCity('Bangalore');
            toast({
              title: "Location Access",
              description: "Please enable location access for better results",
              variant: "default",
            });
          },
          { 
            enableHighAccuracy: true, 
            timeout: 15000, 
            maximumAge: 10000 
          }
        );
      } else {
        const defaultLocation = { lat: 12.9716, lng: 77.5946 };
        setUserLocation(defaultLocation);
        setMapCenter(defaultLocation);
        setUserCity('Bangalore');
      }

      await fetchMerchants();
    };
    
    initializeSearch();
  }, []);

  // Get user's city using reverse geocoding
  const getUserCity = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyB28nWHDBaEoMGIEoqfWDh6L2VRkM5AMwc`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const addressComponents = data.results[0].address_components;
        const cityComponent = addressComponents.find(component => 
          component.types.includes('locality') || component.types.includes('administrative_area_level_2')
        );
        
        if (cityComponent) {
          setUserCity(cityComponent.long_name);
        }
      }
    } catch (error) {
      console.error('Error getting user city:', error);
    }
  };

  // Fetch merchants from database with services and apply filters
  const fetchMerchants = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching merchants with filters:", filters);
      
      let query = supabase
        .from('merchants')
        .select(`
          *,
          services (
            id,
            merchant_id,
            name,
            price,
            duration,
            description,
            image_url,
            created_at
          )
        `);

      // Apply gender focus filter at database level
      if (filters.genderFocus !== 'all') {
        console.log(`Applying gender filter: ${filters.genderFocus}`);
        query = query.or(`gender_focus.eq.${filters.genderFocus},gender_focus.eq.unisex`);
      }

      // Apply category filter at database level
      if (filters.category !== 'all') {
        console.log(`Applying category filter: ${filters.category}`);
        query = query.eq('category', filters.category);
      }

      // Apply rating filter at database level
      if (filters.rating !== 'all') {
        const minRating = parseFloat(filters.rating);
        console.log(`Applying minimum rating filter: ${minRating}`);
        query = query.gte('rating', minRating);
      }

      const { data, error } = await query.order('rating', { ascending: false });
        
      if (error) throw error;
      
      console.log(`Fetched ${data?.length || 0} merchants from database`);
      
      if (data) {
        // Apply price range filter client-side based on services
        let filteredData = data as Merchant[];
        
        if (filters.priceRange !== 'all') {
          console.log(`Applying price range filter: ${filters.priceRange}`);
          
          filteredData = filteredData.filter(merchant => {
            if (!merchant.services || merchant.services.length === 0) return false;
            
            const minPrice = Math.min(...merchant.services.map(s => s.price));
            
            switch (filters.priceRange) {
              case 'low':
                return minPrice <= 500;
              case 'medium':
                return minPrice > 500 && minPrice <= 1000;
              case 'high':
                return minPrice > 1000;
              default:
                return true;
            }
          });
          
          console.log(`${filteredData.length} merchants after price filter`);
        }
        
        // Set all merchants for the map (no filtering by city)
        setAllMerchants(filteredData);

        // Now apply city filtering for the bottom sheet
        if (filteredData) {
          let filtered = filteredData as Merchant[];
          // Only filter by user's city if no search term
          if (userCity) {
            filtered = filtered.filter((merchant) => merchant.address?.toLowerCase().includes(userCity.toLowerCase()));
          }
          setCityFilteredMerchants(filtered);
        }
      }
    } catch (error: any) {
      console.error('Error fetching merchants:', error);
      toast({
        title: "Error",
        description: "Failed to fetch merchants. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch merchants when filters change
  useEffect(() => {
    fetchMerchants();
  }, [filters.genderFocus, filters.rating, filters.category, filters.priceRange]);

  // Handle search input changes and generate suggestions
  useEffect(() => {
    if (searchTerm.length > 0) {
      const suggestions = allMerchants.filter(merchant => 
        merchant.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (merchant.services && merchant.services.some(service => 
          service.name.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      ).slice(0, 5); // Limit to 5 suggestions
      
      setSearchSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, allMerchants]);

  // DISTANCE CALCULATION + sort for both
  useEffect(() => {
    // Add distance to allMerchants and cityFilteredMerchants
    const addDistance = (merchantsArr: Merchant[]): Merchant[] => {
      if (!userLocation) return merchantsArr;
      return merchantsArr.map((merchant) => {
        const distance = calculateDistance(
          userLocation.lat, userLocation.lng, merchant.lat, merchant.lng
        );
        return {
          ...merchant,
          distance: `${distance.toFixed(1)} km`,
          distanceValue: distance
        };
      });
    };

    setAllMerchants(prev => addDistance(prev));
    setCityFilteredMerchants(prev => addDistance(prev));
  }, [userLocation]);

  // SEARCH FILTERING for city list (bottom sheet)
  useEffect(() => {
    let filtered = allMerchants;

    // Search term applies globally (to both map and cityFilteredMerchants)
    if (searchTerm) {
      filtered = allMerchants.filter(merchant =>
        merchant.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (merchant.services && merchant.services.some(service =>
          service.name.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      );
    } else if (userCity) {
      // Only show city-filtered list in the bottom sheet if no search
      filtered = allMerchants.filter(merchant =>
        merchant.address?.toLowerCase().includes(userCity.toLowerCase())
      );
    }
    
    // Apply sorting
    if (filters.sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (filters.sortBy === 'name') {
      filtered.sort((a, b) => a.shop_name.localeCompare(b.shop_name));
    } else if (filters.sortBy === 'distance' && userLocation) {
      filtered.sort((a, b) => (a.distanceValue || 0) - (b.distanceValue || 0));
    }
    
    setCityFilteredMerchants(filtered);
  }, [searchTerm, userCity, allMerchants, filters.sortBy]);

  // Calculate distance using Haversine formula
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (merchant: Merchant) => {
    setSearchTerm(merchant.shop_name);
    setShowSuggestions(false);
    setSelectedMerchant(merchant);
    
    // Smooth zoom to the selected merchant with animation
    setMapCenter({ lat: merchant.lat, lng: merchant.lng });
    setMapZoom(16);
    
    // Focus the search input to blur it
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Map markers always use ALL merchants
  const mapMarkers = allMerchants.map(merchant => ({
    lat: merchant.lat,
    lng: merchant.lng,
    title: merchant.shop_name
  }));

  const handleMarkerClick = (index: number) => {
    const merchant = allMerchants[index];
    setSelectedMerchant(merchant);
    setMapPopupMerchant(merchant);
    
    // Center the map on the selected merchant with smooth animation
    setMapCenter({ lat: merchant.lat, lng: merchant.lng });
    setMapZoom(16);
  };

  const handleCloseMapPopup = () => {
    setMapPopupMerchant(null);
    setSelectedMerchant(null);
  };

  const handleBookNowFromMap = (merchant: Merchant) => {
    navigate(`/merchant/${merchant.id}`);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden relative">
      {/* Floating Search Bar with Suggestions */}
      <div className="absolute top-4 left-4 right-4 z-50">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black w-5 h-5 z-10" />
            <Input
              ref={searchInputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search salons, beauty parlours..."
              className="pl-12 pr-4 py-4 rounded-2xl border-0 shadow-lg bg-white/95 backdrop-blur-sm text-base placeholder:text-gray-600 focus:ring-2 focus:ring-booqit-primary font-medium font-poppins"
              onFocus={() => searchTerm.length > 0 && searchSuggestions.length > 0 && setShowSuggestions(true)}
            />
            
            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div 
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 max-h-80 overflow-y-auto z-50"
              >
                {searchSuggestions.map((merchant) => (
                  <div
                    key={merchant.id}
                    className="flex items-center p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => handleSuggestionClick(merchant)}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 font-righteous">{merchant.shop_name}</h4>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="line-clamp-1 font-poppins">{merchant.address}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 font-poppins">{merchant.category}</p>
                    </div>
                    <div className="flex items-center ml-2">
                      {merchant.rating && (
                        <div className="flex items-center bg-green-100 px-2 py-1 rounded-full">
                          <span className="text-xs font-medium text-green-800 font-poppins">
                            ★ {merchant.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Map View - Full Height */}
      <div className="flex-1 w-full">
        <GoogleMapComponent 
          center={mapCenter}
          zoom={mapZoom}
          markers={mapMarkers}
          className="h-full w-full"
          onMarkerClick={handleMarkerClick}
          onClick={() => {
            setSelectedMerchant(null);
            setMapPopupMerchant(null);
          }}
          showUserLocation={true}
        />
      </div>

      {/* Merchant Map Popup */}
      {mapPopupMerchant && (
        <MerchantMapPopup
          merchant={mapPopupMerchant}
          onClose={handleCloseMapPopup}
          onBookNow={handleBookNowFromMap}
        />
      )}

      {/* Bottom Sheet with filters and nearby venues */}
      <SearchBottomSheet 
        merchants={cityFilteredMerchants}
        filters={filters}
        onFiltersChange={setFilters}
        isLoading={isLoading}
        onMerchantSelect={(merchant) => navigate(`/merchant/${merchant.id}`)}
        userCity={userCity}
      />
    </div>
  );
};

export default SearchPage;
