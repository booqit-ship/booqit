
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

// Type for the RPC response - updated to match the actual database function return
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
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const navigate = useNavigate();
  const [isResolving, setIsResolving] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolveShop = async () => {
      if (!shopSlug) {
        console.log('SHOP RESOLVER: No shop slug provided');
        setError('No shop slug provided');
        setIsResolving(false);
        return;
      }

      // Check if this is actually a shop slug or a known route
      const knownRoutes = [
        'auth', 'customer', 'merchant', 'guest-info', 'guest-shop', 'guest-services', 
        'guest-staff', 'guest-datetime', 'guest-payment', 'guest-success', 
        'guest-history', 'guest-cancel', 'book', 'settings', 'privacy-policy', 
        'terms-and-conditions', 'forgot-password', 'reset-password', 'verify'
      ];

      if (knownRoutes.includes(shopSlug)) {
        console.log('SHOP RESOLVER: This is a known route, not a shop slug:', shopSlug);
        setError('Not a shop slug');
        setIsResolving(false);
        return;
      }

      console.log('SHOP RESOLVER: Resolving shop slug:', shopSlug);
      console.log('SHOP RESOLVER: Current URL:', window.location.href);

      try {
        // Use the resolve function that doesn't require auth
        const { data, error: rpcError } = await supabase
          .rpc('resolve_shop_slug', { p_shop_slug: shopSlug });

        console.log('SHOP RESOLVER: RPC Response:', { data, error: rpcError });

        if (rpcError) {
          console.error('SHOP RESOLVER: Database error:', rpcError);
          setError(`Database error: ${rpcError.message}`);
          return;
        }

        // Check if we got valid data with proper type checking
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.log('SHOP RESOLVER: No data returned for slug:', shopSlug);
          setError('Shop not found - no data returned');
          return;
        }

        const result = data[0] as ResolveShopRpcResponse;
        console.log('SHOP RESOLVER: Parsed result:', result);

        if (!result || !result.success) {
          console.log('SHOP RESOLVER: Shop resolution failed:', result);
          setError('Shop not found - resolution failed');
          return;
        }

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

        console.log('SHOP RESOLVER: Shop resolved successfully:', merchantData.shop_name);
        console.log('SHOP RESOLVER: Navigating to guest-info with merchant ID:', merchantData.id);
        
        // Navigate to guest info page with merchant data - using the correct route
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
        setError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          <p className="text-sm text-gray-500 mt-2">Resolving: {shopSlug}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2 font-righteous">Shop Not Found</h1>
          <p className="text-gray-600 font-poppins mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-4">Shop slug: {shopSlug}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-booqit-primary hover:bg-booqit-primary/90 text-white px-4 py-2 rounded font-poppins"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ShopResolver;
