import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, Wallet, MapPin, Clock, User, Scissors } from "lucide-react";
import { sendBookingNotificationToMerchant } from "@/services/simpleNotificationService";

// Type for the reserve_slot response
interface ReserveSlotResponse {
  success: boolean;
  booking_id?: string;
  error?: string;
  message?: string;
}

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState("pay_on_shop");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Get booking data from location state
  const { 
    merchant, 
    selectedServices, 
    selectedStaff, 
    selectedDate, 
    selectedTime, 
    totalPrice, 
    totalDuration 
  } = location.state || {};

  useEffect(() => {
    // Redirect if no booking data
    if (!merchant || !selectedServices || !selectedStaff || !selectedDate || !selectedTime) {
      toast.error("Missing booking information");
      navigate("/");
      return;
    }
  }, [merchant, selectedServices, selectedStaff, selectedDate, selectedTime, navigate]);

  const handlePayment = async () => {
    if (!user?.id || !merchant || !selectedServices?.length) {
      toast.error("Missing required information");
      return;
    }

    setIsProcessing(true);

    try {
      console.log("PAYMENT_FLOW: Starting payment processing...");
      console.log("Services:", selectedServices);
      console.log("Total duration:", totalDuration, "minutes");
      console.log("Total price:", totalPrice);

      // Create booking with first service (main service)
      const mainService = selectedServices[0];
      
      const bookingParams = {
        p_user_id: user.id,
        p_merchant_id: merchant.id,
        p_service_id: mainService.id,
        p_staff_id: selectedStaff.id,
        p_date: selectedDate,
        p_time_slot: selectedTime,
        p_service_duration: totalDuration || mainService.duration || 30
      };

      console.log("PAYMENT_FLOW: Creating booking with params:", bookingParams);

      // Reserve slot with proper typing
      const { data: slotData, error: slotError } = await supabase.rpc('reserve_slot', bookingParams);

      if (slotError) {
        console.error("PAYMENT_FLOW: Slot reservation failed:", slotError);
        toast.error("Failed to reserve time slot. Please try again.");
        return;
      }

      // Type assertion for the response - convert through unknown for type safety
      const slotResponse = slotData as unknown as ReserveSlotResponse;

      if (!slotResponse?.success) {
        console.error("PAYMENT_FLOW: Slot reservation failed:", slotResponse);
        toast.error("Failed to reserve time slot. Please try again.");
        return;
      }

      console.log("PAYMENT_FLOW: Slot reservation response:", slotResponse);
      const bookingId = slotResponse.booking_id;
      
      if (!bookingId) {
        console.error("PAYMENT_FLOW: No booking ID returned");
        toast.error("Failed to create booking. Please try again.");
        return;
      }

      console.log("PAYMENT_FLOW: Booking created with ID:", bookingId);

      // Confirm booking
      const { error: confirmError } = await supabase.rpc('confirm_booking_payment', {
        p_booking_id: bookingId,
        p_user_id: user.id
      });

      if (confirmError) {
        console.error("PAYMENT_FLOW: Booking confirmation failed:", confirmError);
        toast.error("Failed to confirm booking");
        return;
      }

      console.log("PAYMENT_FLOW: Booking confirmed successfully");

      // Create payment record
      const paymentData = {
        booking_id: bookingId,
        method: paymentMethod,
        amount: totalPrice,
        status: 'completed'
      };

      console.log("PAYMENT_FLOW: Creating payment record:", paymentData);

      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData);

      if (paymentError) {
        console.error("PAYMENT_FLOW: Payment creation failed:", paymentError);
        // Don't fail here - booking is already confirmed
      } else {
        console.log("PAYMENT_FLOW: Payment record created successfully");
      }

      // Send simple notification to merchant
      console.log("PAYMENT_FLOW: Sending notification to merchant...");
      const merchantUserId = merchant.user_id;
      const customerName = user.user_metadata?.name || user.email || 'A customer';
      const serviceNames = selectedServices.map(s => s.name).join(', ');
      const timeSlot = new Date(`${selectedDate} ${selectedTime}`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      console.log("PAYMENT_FLOW: Sending simple notification to merchant:", {
        merchantUserId,
        customerName,
        serviceNames,
        timeSlot,
        bookingId
      });

      const notificationResult = await sendBookingNotificationToMerchant(
        merchantUserId,
        customerName,
        serviceNames,
        timeSlot,
        bookingId
      );

      if (notificationResult.success) {
        console.log("PAYMENT_FLOW: Notification sent successfully");
      } else {
        console.log("PAYMENT_FLOW: Notification failed but booking successful:", notificationResult.reason);
      }

      console.log("PAYMENT_FLOW: Process completed successfully");

      toast.success("Booking confirmed successfully!");
      
      // Navigate to receipt page
      navigate('/receipt', {
        state: {
          booking: { id: bookingId, ...bookingParams },
          merchant,
          selectedServices,
          totalPrice,
          totalDuration
        }
      });

    } catch (error) {
      console.error("PAYMENT_FLOW: Error:", error);
      toast.error("Payment processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!merchant || !selectedServices) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const timeObj = new Date();
    timeObj.setHours(parseInt(hours), parseInt(minutes));
    return timeObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-md mx-auto space-y-4">
        {/* Booking Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-gray-500 mt-1" />
              <div>
                <p className="font-medium">{merchant.shop_name}</p>
                <p className="text-sm text-gray-600">{merchant.address}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-500" />
              <p className="text-sm">{selectedStaff.name}</p>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium">{formatDate(selectedDate)}</p>
                <p className="text-sm text-gray-600">{formatTime(selectedTime)}</p>
                <p className="text-xs text-gray-500">{totalDuration} minutes</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-start space-x-3">
                <Scissors className="w-5 h-5 text-gray-500 mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Services:</p>
                  {selectedServices.map((service, index) => (
                    <div key={index} className="flex justify-between text-sm mt-1">
                      <span>{service.name}</span>
                      <span>₹{service.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>₹{totalPrice}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pay_on_shop" id="pay_on_shop" />
                <Label htmlFor="pay_on_shop" className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4" />
                  <span>Pay at Shop</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 opacity-50">
                <RadioGroupItem value="card" id="card" disabled />
                <Label htmlFor="card" className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Credit/Debit Card (Coming Soon)</span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Confirm Button */}
        <Button 
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full h-12"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Confirm Booking - ₹${totalPrice}`
          )}
        </Button>
      </div>
    </div>
  );
}
