
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedMerchants } from '@/hooks/useOptimizedMerchants';
import { useOptimizedUserProfile } from '@/hooks/useOptimizedUserProfile';
import { useLocationManager } from '@/hooks/useLocationManager';
import { useSearchManager } from '@/hooks/useSearchManager';
import { Merchant } from '@/types';

// Lazy-loaded components for better performance
import UpcomingBookings from '@/components/customer/UpcomingBookings';
import LazyGoogleMap from '@/components/customer/LazyGoogleMap';
import OptimizedShopsList from '@/components/customer/OptimizedShopsList';
import HomeHeader from '@/components/customer/HomeHeader';
import SearchResults from '@/components/customer/SearchResults';
import CategoriesSection from '@/components/customer/CategoriesSection';

const HomePage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const navigate = useNavigate();

  // Use optimized hooks
  const { userName, userAvatar } = useOptimizedUserProfile();
  const { userLocation, locationName } = useLocationManager();
  const { merchants, isLoading } = useOptimizedMerchants(userLocation);
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    showSearchResults,
    handleSearch,
    clearSearch
  } = useSearchManager(userLocation);

  // Memoized filtered merchants to prevent unnecessary recalculations
  const filteredMerchants = useMemo(() => {
    if (!activeCategory) return merchants;
    
    let dbCategory = activeCategory;
    if (activeCategory === "Salon") {
      dbCategory = "barber_shop";
    } else if (activeCategory === "Beauty Parlour") {
      dbCategory = "beauty_parlour";
    }
    
    return merchants.filter(shop => 
      shop.category.toLowerCase() === dbCategory.toLowerCase()
    );
  }, [merchants, activeCategory]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleCategoryClick = useCallback((categoryName: string) => {
    setActiveCategory(prev => prev === categoryName ? null : categoryName);
    clearSearch();
  }, [clearSearch]);

  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    handleSearch(value);
  }, [setSearchQuery, handleSearch]);

  const handleShopClick = useCallback((merchant: Merchant) => {
    navigate(`/merchant/${merchant.id}`);
  }, [navigate]);

  const handleProfileClick = useCallback(() => {
    navigate('/settings/account');
  }, [navigate]);

  const handleClearFilter = useCallback(() => {
    setActiveCategory(null);
  }, []);

  return (
    <div className="pb-20 min-h-screen">
      <HomeHeader
        userName={userName}
        userAvatar={userAvatar}
        locationName={locationName}
        searchQuery={searchQuery}
        onSearchChange={handleSearchInputChange}
        onProfileClick={handleProfileClick}
      />

      <div className="p-6 space-y-8">
        {showSearchResults ? (
          <SearchResults
            searchResults={searchResults}
            onShopClick={handleShopClick}
            onClear={clearSearch}
          />
        ) : (
          <>
            <UpcomingBookings />
            
            <CategoriesSection
              activeCategory={activeCategory}
              onCategoryClick={handleCategoryClick}
            />

            <OptimizedShopsList
              shops={filteredMerchants}
              isLoading={isLoading}
              activeCategory={activeCategory}
              onClearFilter={handleClearFilter}
            />

            <LazyGoogleMap center={userLocation} merchants={filteredMerchants} />
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(HomePage);
