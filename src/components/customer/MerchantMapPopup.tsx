import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Clock, X } from 'lucide-react';
import { Merchant } from '@/types';
interface MerchantMapPopupProps {
  merchant: Merchant;
  onClose: () => void;
  onBookNow: (merchant: Merchant) => void;
}
const MerchantMapPopup: React.FC<MerchantMapPopupProps> = ({
  merchant,
  onClose,
  onBookNow
}) => {
  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  return <div className="absolute bottom-28 left-4 right-4 z-50">
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden max-h-[60vh]">
        <CardContent className="p-0">
          {/* Header with close button */}
          <div className="relative p-4 pb-3">
            <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200">
              <X className="h-4 w-4" />
            </Button>
            
            {/* Shop name and category */}
            <div className="pr-12">
              <h3 className="text-gray-900 line-clamp-1 text-xl font-light">
                {merchant.shop_name}
              </h3>
              <Badge variant="secondary" className="mt-1 text-xs">
                {formatCategory(merchant.category)}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-4">
            {/* Rating */}
            {merchant.rating && <div className="flex items-center mb-3">
                <div className="flex items-center bg-green-100 px-2 py-1 rounded-full mr-2">
                  <Star className="w-3 h-3 text-green-600 fill-current mr-1" />
                  <span className="text-sm font-medium text-green-800">
                    {merchant.rating.toFixed(1)}
                  </span>
                </div>
                {merchant.distance && <span className="text-sm text-gray-600">
                    • {merchant.distance}
                  </span>}
              </div>}

            {/* Address */}
            <div className="flex items-start mb-3">
              <MapPin className="w-4 h-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-600 line-clamp-2">
                {merchant.address}
              </p>
            </div>

            {/* Opening hours */}
            <div className="flex items-center mb-3">
              <Clock className="w-4 h-4 text-gray-500 mr-2" />
              <span className="text-sm text-gray-600">
                {formatTime(merchant.open_time)} - {formatTime(merchant.close_time)}
              </span>
            </div>

            {/* Description */}
            {merchant.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {merchant.description}
              </p>}

            {/* Services preview */}
            {merchant.services && merchant.services.length > 0 && <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Popular Services</p>
                <div className="flex gap-2 overflow-x-auto">
                  {merchant.services.slice(0, 2).map(service => <div key={service.id} className="flex-shrink-0 bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs font-medium text-gray-900">{service.name}</p>
                      <p className="text-xs text-gray-600">₹{service.price}</p>
                    </div>)}
                  {merchant.services.length > 2 && <div className="flex-shrink-0 bg-gray-50 rounded-lg px-3 py-2 flex items-center">
                      <p className="text-xs text-gray-600">+{merchant.services.length - 2} more</p>
                    </div>}
                </div>
              </div>}

            {/* Book Now Button */}
            <Button onClick={() => onBookNow(merchant)} className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-white font-medium py-3 rounded-xl">
              Book Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default MerchantMapPopup;