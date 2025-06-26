
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
}

const ReceiptTemplate: React.FC<ReceiptTemplateProps> = ({ data, forImage = false }) => {
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

  const containerClass = forImage 
    ? "w-[800px] bg-white p-8 font-poppins" 
    : "w-full bg-white";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-10 w-10 text-purple-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2 font-righteous">Quick Booqit</h1>
        <p className="text-xl font-semibold text-green-600 font-righteous">Booking Confirmed!</p>
        <p className="text-gray-600 font-poppins">Your appointment has been successfully booked</p>
      </div>

      {/* Booking ID */}
      <div className="text-center mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 font-poppins mb-1">Booking ID</p>
        <p className="font-mono text-xl font-bold text-gray-800">{bookingId}</p>
      </div>

      {/* Customer Info */}
      <div className="mb-6">
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
          <User className="h-6 w-6 text-blue-600" />
          <div>
            <p className="font-semibold font-poppins text-blue-800">{guestInfo.name}</p>
            <p className="text-sm text-blue-600 font-poppins">{guestInfo.phone}</p>
            {guestInfo.email && (
              <p className="text-sm text-blue-600 font-poppins">{guestInfo.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Shop Info */}
      <div className="mb-6">
        <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
          <MapPin className="h-6 w-6 text-purple-600 mt-1" />
          <div>
            <p className="font-semibold font-poppins text-purple-800">{merchant.shop_name}</p>
            <p className="text-sm text-purple-600 font-poppins">{merchant.address}</p>
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <div className="mb-6">
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
          <Calendar className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-semibold font-poppins text-green-800">
              {formatDateInIST(new Date(bookingDate), 'EEE, MMM d, yyyy')}
            </p>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Clock className="h-4 w-4" />
              <span className="font-poppins">{formatTimeToAmPm(bookingTime)}</span>
              {selectedStaffDetails && (
                <span className="font-poppins">• with {selectedStaffDetails.name}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="mb-6">
        <h3 className="font-semibold font-righteous text-gray-800 text-lg mb-4">Services Booked:</h3>
        {selectedServices?.map((service) => (
          <div key={service.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-2">
            <span className="font-poppins">{service.name} ({service.duration}min)</span>
            <span className="font-semibold text-purple-600">₹{service.price}</span>
          </div>
        ))}
        <div className="border-t-2 border-purple-200 pt-3 flex justify-between items-center font-semibold bg-purple-50 p-3 rounded-lg">
          <span className="font-poppins text-purple-800 text-lg">Total Amount:</span>
          <span className="text-2xl text-purple-600">₹{totalPrice}</span>
        </div>
      </div>

      {/* Payment Notice */}
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center">
            <span className="text-yellow-700 text-lg font-bold">₹</span>
          </div>
          <div>
            <h4 className="font-medium text-yellow-800 font-righteous">Payment at Shop</h4>
            <p className="text-sm text-yellow-700 font-poppins">
              Please pay ₹{totalPrice} at the shop after your service is completed.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-500 font-poppins">
          Thank you for choosing our service! We look forward to seeing you.
        </p>
        <p className="text-xs text-gray-400 font-poppins mt-2">
          Generated by Quick Booqit • {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default ReceiptTemplate;
