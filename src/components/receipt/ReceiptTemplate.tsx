
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock, MapPin, User } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';

interface ReceiptData {
  bookingId: string;
  merchant: {
    shop_name: string;
    address: string;
  };
  selectedServices: Array<{
    id: string;
    name: string;
    duration: number;
    price: number;
  }>;
  totalPrice: number;
  bookingDate: string;
  bookingTime: string;
  guestInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  selectedStaffDetails?: {
    name: string;
  } | null;
}

interface ReceiptTemplateProps {
  data: ReceiptData;
  forImage?: boolean;
  forMobile?: boolean;
}

const ReceiptTemplate: React.FC<ReceiptTemplateProps> = ({ 
  data, 
  forImage = false, 
  forMobile = false 
}) => {
  const {
    bookingId,
    merchant,
    selectedServices,
    totalPrice,
    bookingDate,
    bookingTime,
    guestInfo,
    selectedStaffDetails
  } = data;

  const getContainerClass = () => {
    if (forImage) return "w-[800px] bg-white p-8 font-poppins";
    if (forMobile) return "w-full bg-white p-2 sm:p-4 font-poppins text-xs sm:text-sm";
    return "w-full bg-white";
  };

  const getHeaderIconSize = () => forMobile ? "w-8 h-8 sm:w-12 sm:h-12" : "w-16 h-16";
  const getIconSize = () => forMobile ? "w-3 h-3 sm:w-4 sm:h-4" : "w-6 h-6";
  const getTitleSize = () => forMobile ? "text-lg sm:text-xl md:text-2xl" : "text-3xl";
  const getSubtitleSize = () => forMobile ? "text-sm sm:text-base md:text-lg" : "text-xl";
  const getTextSize = () => forMobile ? "text-xs sm:text-sm" : "text-base";
  const getSpacing = () => forMobile ? "mb-3 sm:mb-4" : "mb-6";
  const getPadding = () => forMobile ? "p-2 sm:p-3" : "p-4";

  return (
    <div className={getContainerClass()}>
      {/* Header */}
      <div className={`text-center ${getSpacing()}`}>
        <div className={`${getHeaderIconSize()} bg-gradient-to-r from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4`}>
          <CheckCircle className={`${forMobile ? 'h-5 w-5 sm:h-8 sm:w-8' : 'h-10 w-10'} text-purple-600`} />
        </div>
        <h1 className={`${getTitleSize()} font-bold text-gray-800 mb-1 sm:mb-2 font-righteous`}>Quick Booqit</h1>
        <p className={`${getSubtitleSize()} font-semibold text-green-600 font-righteous`}>Booking Confirmed!</p>
        <p className={`text-gray-600 font-poppins ${getTextSize()}`}>Your appointment has been successfully booked</p>
      </div>

      {/* Booking ID */}
      <div className={`text-center ${getSpacing()} ${getPadding()} bg-gray-50 rounded-lg`}>
        <p className={`${getTextSize()} text-gray-600 font-poppins mb-1`}>Booking ID</p>
        <p className={`font-mono ${forMobile ? 'text-sm sm:text-base md:text-lg' : 'text-xl'} font-bold text-gray-800 break-all`}>{bookingId}</p>
      </div>

      {/* Customer Info */}
      <div className={getSpacing()}>
        <div className={`flex items-center gap-2 sm:gap-3 ${getPadding()} bg-blue-50 rounded-lg`}>
          <User className={`${getIconSize()} text-blue-600 flex-shrink-0`} />
          <div className="min-w-0 flex-1">
            <p className={`font-semibold font-poppins text-blue-800 ${getTextSize()} break-words`}>{guestInfo.name}</p>
            <p className={`${getTextSize()} text-blue-600 font-poppins break-all`}>{guestInfo.phone}</p>
            {guestInfo.email && (
              <p className={`${getTextSize()} text-blue-600 font-poppins break-all`}>{guestInfo.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Shop Info */}
      <div className={getSpacing()}>
        <div className={`flex items-start gap-2 sm:gap-3 ${getPadding()} bg-purple-50 rounded-lg`}>
          <MapPin className={`${getIconSize()} text-purple-600 mt-1 flex-shrink-0`} />
          <div className="min-w-0 flex-1">
            <p className={`font-semibold font-poppins text-purple-800 ${getTextSize()} break-words`}>{merchant.shop_name}</p>
            <p className={`${getTextSize()} text-purple-600 font-poppins break-words`}>{merchant.address}</p>
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <div className={getSpacing()}>
        <div className={`flex items-center gap-2 sm:gap-3 ${getPadding()} bg-green-50 rounded-lg`}>
          <Calendar className={`${getIconSize()} text-green-600 flex-shrink-0`} />
          <div className="min-w-0 flex-1">
            <p className={`font-semibold font-poppins text-green-800 ${getTextSize()} break-words`}>
              {formatDateInIST(new Date(bookingDate), 'EEE, MMM d, yyyy')}
            </p>
            <div className={`flex items-center gap-1 sm:gap-2 ${getTextSize()} text-green-600 flex-wrap`}>
              <Clock className={`${forMobile ? 'h-3 w-3' : 'h-4 w-4'} flex-shrink-0`} />
              <span className="font-poppins">{formatTimeToAmPm(bookingTime)}</span>
              {selectedStaffDetails && (
                <span className="font-poppins break-words">• with {selectedStaffDetails.name}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className={getSpacing()}>
        <h3 className={`font-semibold font-righteous text-gray-800 ${forMobile ? 'text-sm sm:text-base' : 'text-lg'} mb-2 sm:mb-4`}>Services Booked:</h3>
        {selectedServices?.map((service) => (
          <div key={service.id} className={`flex justify-between items-center ${forMobile ? 'p-2 sm:p-3' : 'p-3'} bg-gray-50 rounded-lg mb-1 sm:mb-2`}>
            <span className={`font-poppins ${getTextSize()} break-words flex-1 mr-2`}>
              {service.name} ({service.duration}min)
            </span>
            <span className={`font-semibold text-purple-600 ${getTextSize()} flex-shrink-0`}>₹{service.price}</span>
          </div>
        ))}
        <div className={`border-t-2 border-purple-200 pt-2 sm:pt-3 flex justify-between items-center font-semibold bg-purple-50 ${forMobile ? 'p-2 sm:p-3' : 'p-3'} rounded-lg gap-2`}>
          <span className={`font-poppins text-purple-800 ${forMobile ? 'text-sm sm:text-base' : 'text-lg'} break-words flex-1`}>Total Amount:</span>
          <span className={`${forMobile ? 'text-lg sm:text-xl' : 'text-2xl'} text-purple-600 flex-shrink-0`}>₹{totalPrice}</span>
        </div>
      </div>

      {/* Payment Notice */}
      <div className={`${getSpacing()} ${getPadding()} bg-yellow-50 rounded-lg border border-yellow-200`}>
        <div className="flex items-start gap-2 sm:gap-3">
          <div className={`${forMobile ? 'w-6 h-6 sm:w-8 sm:h-8' : 'w-8 h-8'} bg-yellow-200 rounded-full flex items-center justify-center flex-shrink-0`}>
            <span className={`text-yellow-700 ${forMobile ? 'text-sm sm:text-base' : 'text-lg'} font-bold`}>₹</span>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className={`font-medium text-yellow-800 font-righteous ${getTextSize()}`}>Payment at Shop</h4>
            <p className={`${getTextSize()} text-yellow-700 font-poppins break-words`}>
              Please pay ₹{totalPrice} at the shop after your service is completed.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`text-center pt-3 sm:pt-6 border-t border-gray-200`}>
        <p className={`${getTextSize()} text-gray-500 font-poppins break-words`}>
          Thank you for choosing our service! We look forward to seeing you.
        </p>
        <p className={`${forMobile ? 'text-xs' : 'text-xs'} text-gray-400 font-poppins mt-1 sm:mt-2 break-words`}>
          Generated by Quick Booqit • {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default ReceiptTemplate;
