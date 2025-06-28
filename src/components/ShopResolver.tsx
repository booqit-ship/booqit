
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

// Reserved routes that should not be treated as shop slugs
const RESERVED_ROUTES = [
  'auth', 'merchant', 'customer', 'guest', 'settings', 'home', 'search', 'map',
  'booking', 'payment', 'profile', 'calendar', 'services', 'staff', 'reviews',
  'about', 'contact', 'privacy', 'terms', 'onboarding', 'dashboard', 'analytics',
  'earnings', 'notifications', 'admin', 'api', 'login', 'signup', 'verify',
  'reset-password', 'forgot-password', 'guest-info', 'guest-booking'
];

const isValidShopSlug = (slug: string): boolean => {
  // Check if it's a reserved route
  if (RESERVED_ROUTES.includes(slug.toLowerCase())) {
    return false;
  }
  
  // Check basic slug format (letters, numbers, hyphens, underscores)
  const slugPattern = /^[a-zA-Z0-9_-]+$/;
  if (!slugPattern.test(slug)) {
    return false;
  }
  
  // Check length (reasonable limits)
  if (slug.length < 2 || slug.length > 50) {
    return false;
  }
  
  return true;
};

const ShopResolver: React.FC<ShopResolverProps> = ({ children }) => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const [isResolving, setIsResolving] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const resolveShop = async () => {
      // Enhanced debugging
      const currentUrl = window.location.href;
      const pathname = window.location.pathname;
      
      console.log('=== SHOP RESOLVER DEBUG START ===');
      console.log('Current URL:', currentUrl);
      console.log('Pathname:', pathname);
      console.log('useParams shopSlug:', shopSlug);
      console.log('Type of shopSlug:', typeof shopSlug);
      
      if (!shopSlug) {
        console.log('❌ No shop slug provided in URL parameters');
        setError('No shop slug found in URL');
        setIsResolving(false);
        return;
      }

      // Check if this is a reserved route
      if (!isValidShopSlug(shopSlug)) {
        console.log('❌ Invalid shop slug format or reserved route:', shopSlug);
        setError(`Invalid shop slug format: "${shopSlug}"`);
        setIsResolving(false);
        return;
      }

      console.log('✅ Valid shop slug format:', shopSlug);
      console.log('📡 Attempting to resolve shop slug...');

      try {
        const { data, error: rpcError } = await supabase
          .rpc('resolve_shop_slug', { p_shop_slug: shopSlug });

        console.log('🔄 Database response:', { data, error: rpcError });

        if (rpcError) {
          console.error('❌ Database RPC error:', rpcError);
          setError(`Database error: ${rpcError.message}`);
          setDebugInfo({ rpcError, shopSlug });
          return;
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
          console.log('❌ No shop found for slug:', shopSlug);
          console.log('📊 Available debug info:', { 
            dataType: typeof data, 
            isArray: Array.isArray(data),
            dataLength: data?.length,
            shopSlug 
          });
          setError(`No shop found with slug: "${shopSlug}"`);
          setDebugInfo({ noDataFound: true, shopSlug, data });
          return;
        }

        const result = data[0] as ResolveShopRpcResponse;
        console.log('📋 Shop resolution result:', result);

        if (!result || !result.success) {
          console.log('❌ Shop resolution failed:', result);
          setError(`Shop resolution failed for: "${shopSlug}"`);
          setDebugInfo({ resolutionFailed: true, result, shopSlug });
          return;
        }

        // Successfully resolved shop
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

        console.log('✅ Shop resolved successfully!');
        console.log('🏪 Shop details:', {
          name: merchantData.shop_name,
          id: merchantData.id,
          category: merchantData.category
        });
        
        console.log('🚀 Navigating to guest-info page...');
        
        // Navigate to guest info page
        navigate(`/guest-info/${merchantData.id}`, {
          state: { 
            merchant: merchantData,
            fromCustomUrl: true,
            shopSlug: shopSlug
          },
          replace: true
        });

        console.log('=== SHOP RESOLVER DEBUG END (SUCCESS) ===');

      } catch (error) {
        console.error('❌ Unexpected error in shop resolution:', error);
        setError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setDebugInfo({ unexpectedError: true, error: error instanceof Error ? error.message : error, shopSlug });
        console.log('=== SHOP RESOLVER DEBUG END (ERROR) ===');
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
          <p className="text-gray-600 font-poppins">Resolving shop...</p>
          <p className="text-sm text-gray-500 mt-2">Looking up: {shopSlug}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2 font-righteous">Shop Not Found</h1>
          <p className="text-gray-600 font-poppins mb-4">{error}</p>
          
          <div className="bg-gray-100 p-4 rounded-lg mb-4 text-left">
            <p className="text-sm text-gray-600 mb-2"><strong>Searched for:</strong> {shopSlug}</p>
            <p className="text-sm text-gray-600 mb-2"><strong>URL:</strong> {window.location.pathname}</p>
            {debugInfo && (
              <details className="text-xs text-gray-500 mt-2">
                <summary className="cursor-pointer">Debug Info</summary>
                <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
              </details>
            )}
          </div>

          <div className="space-y-2">
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-white px-4 py-2 rounded font-poppins"
            >
              Go to Home
            </button>
            <button 
              onClick={() => window.location.href = '/search'}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded font-poppins"
            >
              Search for Shops
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ShopResolver;
