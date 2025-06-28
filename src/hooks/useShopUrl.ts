
import { useState, useEffect } from 'react';
import { shopUrlService, ShopUrl } from '@/services/shopUrlService';

export const useShopUrl = (merchantId?: string) => {
  const [shopUrl, setShopUrl] = useState<ShopUrl | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!merchantId) return;

    const fetchShopUrl = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const url = await shopUrlService.getShopUrl(merchantId);
        setShopUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch shop URL');
      } finally {
        setIsLoading(false);
      }
    };

    fetchShopUrl();
  }, [merchantId]);

  const generateBookingUrl = (customDomain?: string) => {
    if (!shopUrl) return null;
    return shopUrlService.generateBookingUrl(shopUrl.shop_slug, customDomain);
  };

  const generateShortUrl = () => {
    if (!shopUrl) return null;
    return shopUrlService.generateShortUrl(shopUrl.shop_slug);
  };

  return {
    shopUrl,
    isLoading,
    error,
    generateBookingUrl,
    generateShortUrl
  };
};
