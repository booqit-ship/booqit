
import { supabase } from '@/integrations/supabase/client';

export interface ShopUrl {
  id: string;
  merchant_id: string;
  shop_slug: string;
  custom_domain?: string;
  is_active: boolean;
  created_at: string;
}

export interface MerchantInfo {
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

interface ResolveShopResponse {
  success: boolean;
  merchant?: MerchantInfo;
  error?: string;
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

class ShopUrlService {
  async resolveShopSlug(shopSlug: string): Promise<ResolveShopResponse> {
    try {
      console.log('ShopUrlService: Resolving slug:', shopSlug);
      
      const { data, error } = await supabase
        .rpc('resolve_shop_slug', { p_shop_slug: shopSlug });

      if (error) {
        console.error('ShopUrlService: Database error:', error);
        return { success: false, error: error.message };
      }

      // Check if we got valid data with proper type checking
      if (!data || !Array.isArray(data) || data.length === 0 || !(data[0] as unknown as ResolveShopRpcResponse)?.success) {
        console.log('ShopUrlService: No shop found for slug:', shopSlug);
        return { success: false, error: 'Shop not found' };
      }

      // Cast the first item to our expected type
      const result = data[0] as unknown as ResolveShopRpcResponse;

      const merchantInfo: MerchantInfo = {
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

      console.log('ShopUrlService: Successfully resolved merchant:', merchantInfo.shop_name);
      return { success: true, merchant: merchantInfo };

    } catch (error) {
      console.error('ShopUrlService: Unexpected error:', error);
      return { success: false, error: 'Failed to resolve shop URL' };
    }
  }

  async getShopUrl(merchantId: string): Promise<ShopUrl | null> {
    try {
      const { data, error } = await supabase
        .from('shop_urls')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.log('ShopUrlService: No shop URL found for merchant:', merchantId);
        return null;
      }

      return data;
    } catch (error) {
      console.error('ShopUrlService: Error fetching shop URL:', error);
      return null;
    }
  }

  generateBookingUrl(shopSlug: string, customDomain?: string): string {
    const baseUrl = customDomain || 'app.booqit.in';
    return `https://${baseUrl}/${shopSlug}`;
  }

  // Generate QR code friendly short URL
  generateShortUrl(shopSlug: string): string {
    return `https://app.booqit.in/${shopSlug}`;
  }
}

export const shopUrlService = new ShopUrlService();
