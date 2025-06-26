
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ShopResolverProps {
  children: React.ReactNode;
}

interface MerchantData {
  id: string;
  shop_name: string;
  category: string;
  address: string;
  image_url?: string;
  open_time: string;
  close_time: string;
  rating?: number;
  description?: string;
}

// Type for the RPC response
interface ResolveShopRpcResponse {
  success: boolean;
  merchant_id: string;
  shop_name: string;
  category: string;
  address: string;
  image_url?: string;
  open_time: string;
  close_time: string;
  rating?: number;
  description?: string;
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
        // Use the new resolve function that doesn't require auth
        const { data, error } = await supabase
          .rpc('resolve_shop_slug', { p_shop_slug: shopSlug });

        if (error) {
          console.error('SHOP RESOLVER: Database error:', error);
          navigate('/404');
          return;
        }

        // Check if we got valid data with proper type checking
        if (!data || !Array.isArray(data) || data.length === 0 || !(data[0] as unknown as ResolveShopRpcResponse)?.success) {
          console.log('SHOP RESOLVER: Shop not found:', shopSlug);
          navigate('/404');
          return;
        }

        // Cast the first item to our expected type
        const result = data[0] as unknown as ResolveShopRpcResponse;

        const merchantData: MerchantData = {
          id: result.merchant_id,
          shop_name: result.shop_name,
          category: result.category,
          address: result.address,
          image_url: result.image_url,
          open_time: result.open_time,
          close_time: result.close_time,
          rating: result.rating,
          description: result.description
        };

        console.log('SHOP RESOLVER: Shop resolved:', merchantData.shop_name);
        
        // Navigate to guest info page with merchant data
        navigate(`/guest-info/${merchantData.id}`, {
          state: { 
            merchant: merchantData,
            fromCustomUrl: true,
            shopSlug: shopSlug
          },
          replace: true
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
