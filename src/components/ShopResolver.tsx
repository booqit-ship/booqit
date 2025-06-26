
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ShopResolverProps {
  children: React.ReactNode;
}

interface ResolveShopResponse {
  success: boolean;
  merchant?: {
    id: string;
    shop_name: string;
    category: string;
    address: string;
    image_url?: string;
  };
  error?: string;
}

const ShopResolver: React.FC<ShopResolverProps> = ({ children }) => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const [isResolving, setIsResolving] = useState(true);

  useEffect(() => {
    const resolveShop = async () => {
      if (!shopSlug) {
        setIsResolving(false);
        return;
      }

      console.log('SHOP RESOLVER: Resolving shop slug:', shopSlug);

      try {
        const { data, error } = await supabase
          .rpc('resolve_shop_slug', { p_shop_slug: shopSlug });

        if (error) {
          console.error('SHOP RESOLVER: Error resolving shop:', error);
          navigate('/404');
          return;
        }

        // Type assertion for the RPC response
        const response = data as unknown as ResolveShopResponse;

        if (!response.success) {
          console.log('SHOP RESOLVER: Shop not found:', shopSlug);
          navigate('/404');
          return;
        }

        console.log('SHOP RESOLVER: Shop resolved:', response.merchant);
        
        // Redirect to guest info page with merchant data
        navigate(`/book/${response.merchant!.id}`, {
          state: { 
            merchant: response.merchant,
            fromCustomUrl: true 
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
