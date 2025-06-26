
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useShopUrl } from '@/hooks/useShopUrl';
import { Copy, ExternalLink, QrCode, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface BookingUrlManagerProps {
  merchantId: string;
  shopName: string;
}

const BookingUrlManager: React.FC<BookingUrlManagerProps> = ({ merchantId, shopName }) => {
  const { shopUrl, isLoading, generateShortUrl } = useShopUrl(merchantId);
  const [showQR, setShowQR] = useState(false);

  const bookingUrl = generateShortUrl();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('URL copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  const shareUrl = async () => {
    if (!bookingUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Book at ${shopName}`,
          text: `Book your appointment at ${shopName}`,
          url: bookingUrl,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      copyToClipboard(bookingUrl);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-booqit-primary mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading booking URL...</p>
        </CardContent>
      </Card>
    );
  }

  if (!shopUrl || !bookingUrl) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-gray-600">Booking URL not available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-righteous">
          <ExternalLink className="h-5 w-5" />
          Your Booking URL
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block font-poppins">
            Share this link with customers:
          </label>
          <div className="flex gap-2">
            <Input 
              value={bookingUrl}
              readOnly
              className="font-mono text-sm font-poppins"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => copyToClipboard(bookingUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-poppins">
            Slug: {shopUrl.shop_slug}
          </Badge>
          {shopUrl.is_active && (
            <Badge variant="outline" className="text-green-600 border-green-600 font-poppins">
              Active
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={shareUrl}
            className="flex-1 font-poppins"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share URL
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.open(bookingUrl, '_blank')}
            className="font-poppins"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>

        <div className="text-xs text-gray-500 font-poppins">
          Customers can book directly using this short URL without needing to register or login.
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingUrlManager;
