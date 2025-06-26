
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shopUrlService } from '@/services/shopUrlService';

interface ShopResolverProps {
  children: React.ReactNode;
}

const ShopResolver: React.FC<ShopResolverProps> = ({ children }) => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const [isResolving, setIsResolving] = useState(true);

  useEffect(() => {
    const resolveShop = async () => {
      if (!shopSlug) {
        console.log('SHOP RESOLVER: No shop slug provided');
        setIsResolving(false);
        return;
      }

      console.log('SHOP RESOLVER: Resolving shop slug:', shopSlug);

      try {
        const response = await shopUrlService.resolveShopSlug(shopSlug);

        if (!response.success) {
          console.log('SHOP RESOLVER: Shop not found:', shopSlug);
          navigate('/404');
          return;
        }

        console.log('SHOP RESOLVER: Shop resolved:', response.merchant);
        
        // Navigate to guest info page with merchant data
        navigate(`/book/${response.merchant!.id}`, {
          state: { 
            merchant: response.merchant,
            fromCustomUrl: true,
            shopSlug: shopSlug
          }
        });

      } catch (error) {
        console.error('SHOP RESOLVER: Unexpected error:', error);
        navigate('/404');
      } finally {
        setIsResolving(false);
      }
    };

    resolveShop();
  }, [shopSlug, navigate]);

  if (isResolving) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-booqit-primary mx-auto mb-4"></div>
          <p className="text-gray-600 font-poppins">Loading shop...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ShopResolver;
