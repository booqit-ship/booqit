
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
}

interface ResolveShopResponse {
  success: boolean;
  merchant?: MerchantInfo;
  error?: string;
}

class ShopUrlService {
  async resolveShopSlug(shopSlug: string): Promise<{ success: boolean; merchant?: MerchantInfo; error?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('resolve_shop_slug', { p_shop_slug: shopSlug });

      if (error) {
        console.error('ShopUrlService: Error resolving shop slug:', error);
        return { success: false, error: error.message };
      }

      // Type assertion for the RPC response
      const response = data as unknown as ResolveShopResponse;
      return response;
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
